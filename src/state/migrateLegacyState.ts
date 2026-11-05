import { SPORTS } from '../constants';
import { normalizeSkills } from '../lib/skills';
import type { Game, Player, PositionDef, Rotation, TeamSettings } from '../types';

// ── Legacy (schema v1–v3) shapes: a single users/{uid}/lineups/main document ──

type LegacyPosition = 'def' | 'mid' | 'fwd';
const LEGACY_POSITIONS: LegacyPosition[] = ['def', 'mid', 'fwd'];

export interface LegacyFormation {
  playersOnField: number;
  defenders: number;
  midfielders: number;
  forwards: number;
}

export interface LegacyRotation {
  def: (string | null)[];
  mid: (string | null)[];
  fwd: (string | null)[];
  bench: string[];
  played: boolean;
  locked: Record<LegacyPosition, boolean[]>;
}

export interface LegacyGame {
  id: string;
  name: string;
  rotations: LegacyRotation[];
  opponentScore: number;
  completed: boolean;
  excludedPlayers: string[];
  formation: LegacyFormation;
}

export interface LegacyDoc {
  players?: unknown;
  goals?: unknown;
  games?: unknown;
  settings?: unknown;
  schemaVersion?: unknown;
  curGame?: unknown;
  /** Set once the document has been copied into a team, so it is never copied twice. */
  migratedToTeam?: unknown;
}

export interface MigratedState {
  players: Player[];
  goals: Record<string, Record<string, number>>;
  games: LegacyGame[];
  settings: { defaultFormation: LegacyFormation; useSkillRatings: boolean };
  curGame: string;
  schemaVersion: number;
}

export const LEGACY_DEFAULT_FORMATION: LegacyFormation = {
  playersOnField: 6, defenders: 2, midfielders: 2, forwards: 2,
};

type CurrentState = Pick<MigratedState, 'players' | 'goals' | 'games' | 'settings' | 'curGame'>;

export const EMPTY_LEGACY: CurrentState = {
  players: [],
  goals: {},
  games: [],
  settings: { defaultFormation: LEGACY_DEFAULT_FORMATION, useSkillRatings: true },
  curGame: '',
};

function toName(p: unknown): string | null {
  if (!p) return null;
  if (typeof p === 'string') return p;
  return (p as { name?: string }).name || null;
}

function isValidFormation(f: unknown): f is LegacyFormation {
  if (!f || typeof f !== 'object') return false;
  const c = f as Record<string, unknown>;
  return typeof c.defenders === 'number' && typeof c.midfielders === 'number' && typeof c.forwards === 'number';
}

function sanitizeRotation(raw: unknown): LegacyRotation {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<LegacyRotation>;
  const rot = {
    def: Array.isArray(r.def) ? r.def.map(toName) : [],
    mid: Array.isArray(r.mid) ? r.mid.map(toName) : [],
    fwd: Array.isArray(r.fwd) ? r.fwd.map(toName) : [],
    bench: Array.isArray(r.bench) ? (r.bench.map(toName).filter(Boolean) as string[]) : [],
    played: r.played === true,
    locked: { ...(r.locked && typeof r.locked === 'object' ? r.locked : {}) } as LegacyRotation['locked'],
  };
  LEGACY_POSITIONS.forEach(pos => {
    if (!Array.isArray(rot.locked[pos])) rot.locked[pos] = rot[pos].map(() => false);
  });
  return rot;
}

/**
 * Migrates a raw legacy Firestore document (any shape from before games had stable
 * ids/formation/excludedPlayers, up through schema v3) into the v3 fields. A field
 * absent from `data` falls back to `current` rather than being wiped.
 *
 * Idempotent per-game: a game that already has an `id` is left as-is and its goals are
 * assumed to already be id-keyed.
 */
export function migrateLegacyState(data: LegacyDoc, current: CurrentState = EMPTY_LEGACY): MigratedState {
  // `skills` MUST be carried through here — this function rebuilds every Player from
  // scratch, so anything not listed is silently erased.
  const players: Player[] = Array.isArray(data.players)
    ? (data.players as unknown[]).map(p =>
        typeof p === 'string'
          ? { name: p, active: true, skills: normalizeSkills(undefined, 'soccer') }
          : {
              name: (p as Player).name || String(p),
              active: (p as Player).active !== false,
              skills: normalizeSkills((p as { skills?: unknown }).skills, 'soccer'),
            }
      )
    : current.players.map(p => ({ ...p, skills: normalizeSkills(p.skills, 'soccer') }));

  const indexToId = new Map<number, string>();
  let games: LegacyGame[] = current.games;
  if (Array.isArray(data.games)) {
    games = (data.games as unknown[]).map((raw, i) => {
      const g = (raw && typeof raw === 'object' ? raw : {}) as Partial<LegacyGame> & { rotations?: unknown[] };
      const id = typeof g.id === 'string' && g.id ? g.id : crypto.randomUUID();
      if (!g.id) indexToId.set(i, id);
      const formation = isValidFormation(g.formation) ? g.formation : LEGACY_DEFAULT_FORMATION;
      return {
        id,
        name: g.name || `Game ${i + 1}`,
        rotations: (g.rotations ?? []).map(sanitizeRotation),
        opponentScore: g.opponentScore || 0,
        completed: g.completed || false,
        excludedPlayers: Array.isArray(g.excludedPlayers) ? (g.excludedPlayers as string[]) : [],
        formation,
      };
    });
  }

  let goals = current.goals;
  if (data.goals && typeof data.goals === 'object') {
    goals = {};
    for (const [player, perGame] of Object.entries(data.goals as Record<string, unknown>)) {
      if (!perGame || typeof perGame !== 'object') continue;
      const remapped: Record<string, number> = {};
      for (const [key, count] of Object.entries(perGame as Record<string, unknown>)) {
        const asIndex = Number(key);
        const newKey = Number.isInteger(asIndex) && indexToId.has(asIndex) ? indexToId.get(asIndex)! : key;
        const n = typeof count === 'number' ? count : Number(count);
        remapped[newKey] = Number.isFinite(n) ? n : 0;
      }
      goals[player] = remapped;
    }
  }

  const storedSettings = data.settings as
    { defaultFormation?: unknown; useSkillRatings?: unknown } | undefined;
  const settings = {
    defaultFormation: isValidFormation(storedSettings?.defaultFormation)
      ? (storedSettings!.defaultFormation as LegacyFormation)
      : current.settings.defaultFormation,
    // A doc written before this feature has no key at all — that means "on".
    // Only an explicitly stored `false` turns it off.
    useSkillRatings: storedSettings
      ? storedSettings.useSkillRatings !== false
      : current.settings.useSkillRatings,
  };

  let curGame = current.curGame;
  if (Array.isArray(data.games)) {
    curGame = games[0]?.id ?? '';
    if (typeof data.curGame === 'number' && games[data.curGame]) {
      curGame = games[data.curGame].id;
    }
  }

  return { players, goals, games, settings, curGame, schemaVersion: 3 };
}

// ── v3 → v4: the legacy document becomes one soccer team ─────────────────────

function formationToPositions(f: LegacyFormation): PositionDef[] {
  const [def, mid, fwd] = SPORTS.soccer.defaultSettings.positions;
  return [
    { ...def, count: f.defenders },
    { ...mid, count: f.midfielders },
    { ...fwd, count: f.forwards },
  ];
}

function convertRotation(r: LegacyRotation): Rotation {
  return {
    slots: { def: [...r.def], mid: [...r.mid], fwd: [...r.fwd] },
    locked: { def: [...r.locked.def], mid: [...r.locked.mid], fwd: [...r.locked.fwd] },
    bench: [...r.bench],
    played: r.played,
  };
}

export interface ConvertedTeam {
  players: Player[];
  settings: TeamSettings;
  games: Game[];
}

/**
 * Turns a legacy single-document lineup into the contents of a soccer team. Goals move
 * from the top-level goals[player][gameId] map onto each game's `scores`. `now` orders
 * the games: they keep their original sequence, one millisecond apart.
 */
export function legacyToTeam(data: LegacyDoc, now = Date.now()): ConvertedTeam {
  const m = migrateLegacyState(data);
  const rotationCount = m.games[0]?.rotations.length || SPORTS.soccer.defaultSettings.rotationCount;

  const games: Game[] = m.games.map((g, i) => {
    const scores: Record<string, number> = {};
    Object.entries(m.goals).forEach(([player, perGame]) => {
      const n = perGame[g.id];
      if (n) scores[player] = n;
    });
    return {
      id: g.id,
      name: g.name,
      rotations: g.rotations.map(convertRotation),
      positions: formationToPositions(g.formation),
      scores,
      opponentScore: g.opponentScore,
      completed: g.completed,
      excludedPlayers: g.excludedPlayers,
      createdAt: now + i,
    };
  });

  return {
    players: m.players,
    settings: {
      positions: formationToPositions(m.settings.defaultFormation),
      rotationCount,
      useSkillRatings: m.settings.useSkillRatings,
    },
    games,
  };
}

/** Whether a legacy document holds anything worth turning into a team. */
export function legacyHasContent(data: LegacyDoc): boolean {
  return (Array.isArray(data.players) && data.players.length > 0)
    || (Array.isArray(data.games) && data.games.length > 0);
}
