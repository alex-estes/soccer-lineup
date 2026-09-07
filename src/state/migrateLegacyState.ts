import { DEFAULT_FORMATION } from '../constants';
import { ensureShape } from '../lib/utils';
import type { AppSettings, AppState, FormationSettings, Game, Goals, Player, Rotation } from '../types';

export interface LegacyDoc {
  players?: unknown;
  goals?: unknown;
  games?: unknown;
  settings?: unknown;
  schemaVersion?: unknown;
  // pre-migration field, read for backward compatibility only
  curGame?: unknown;
}

export interface MigratedState {
  players: Player[];
  goals: Goals;
  games: Game[];
  settings: AppSettings;
  curGame: string;
  schemaVersion: number;
}

type CurrentState = Pick<AppState, 'players' | 'goals' | 'games' | 'settings' | 'curGame'>;

function toName(p: unknown): string | null {
  if (!p) return null;
  if (typeof p === 'string') return p;
  return (p as { name?: string }).name || null;
}

function isValidFormation(f: unknown): f is FormationSettings {
  if (!f || typeof f !== 'object') return false;
  const c = f as Record<string, unknown>;
  return typeof c.defenders === 'number' && typeof c.midfielders === 'number' && typeof c.forwards === 'number';
}

function sanitizeRotation(raw: unknown): Rotation {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Rotation>;
  const rot: Rotation = {
    def: Array.isArray(r.def) ? r.def.map(toName) : [],
    mid: Array.isArray(r.mid) ? r.mid.map(toName) : [],
    fwd: Array.isArray(r.fwd) ? r.fwd.map(toName) : [],
    bench: Array.isArray(r.bench) ? (r.bench.map(toName).filter(Boolean) as string[]) : [],
    played: r.played === true,
    locked: r.locked as Rotation['locked'],
  };
  return ensureShape(rot);
}

/**
 * Migrates a raw Firestore document (any shape from before games had stable
 * ids/formation/excludedPlayers, up through the current shape) into the
 * current AppState fields. Mirrors the previous LOAD_FROM_FIREBASE semantics:
 * a field absent from `data` (e.g. an empty `{}` doc on first-ever load)
 * falls back to `current` rather than being wiped to an empty default —
 * only fields actually present in `data` are transformed/overwritten.
 *
 * Idempotent per-game: a game that already has an `id` is left as-is and its
 * goals are assumed to already be id-keyed, so running this again on an
 * already-migrated document is a no-op.
 */
export function migrateLegacyState(data: LegacyDoc, current: CurrentState): MigratedState {
  const players: Player[] = Array.isArray(data.players)
    ? (data.players as unknown[]).map(p =>
        typeof p === 'string'
          ? { name: p, active: true }
          : { name: (p as Player).name || String(p), active: (p as Player).active !== false }
      )
    : current.players;

  const indexToId = new Map<number, string>();
  let games: Game[] = current.games;
  if (Array.isArray(data.games)) {
    games = (data.games as unknown[]).map((raw, i) => {
      const g = (raw && typeof raw === 'object' ? raw : {}) as Partial<Game> & { rotations?: unknown[] };
      const id = typeof g.id === 'string' && g.id ? g.id : crypto.randomUUID();
      if (!g.id) indexToId.set(i, id);
      const formation = isValidFormation(g.formation) ? g.formation : DEFAULT_FORMATION;
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

  let goals: Goals = current.goals;
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

  const settings: AppSettings = isValidFormation((data.settings as { defaultFormation?: unknown } | undefined)?.defaultFormation)
    ? { defaultFormation: (data.settings as { defaultFormation: FormationSettings }).defaultFormation }
    : current.settings;

  let curGame = current.curGame;
  if (Array.isArray(data.games)) {
    // The games array is changing — current.curGame may point at a game that
    // no longer exists in the new list, so re-resolve it.
    curGame = games[0]?.id ?? '';
    if (typeof data.curGame === 'number' && games[data.curGame]) {
      curGame = games[data.curGame].id;
    }
  }

  return { players, goals, games, settings, curGame, schemaVersion: 2 };
}
