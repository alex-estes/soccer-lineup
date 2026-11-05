import { MAX_POSITION_COUNT, MAX_ROTATIONS, MIN_ROTATIONS, positionSkills, SPORTS } from '../constants';
import { autoGenerate } from '../lib/autoGenerate';
import { cloneRotation, emptyRotation, emptyRotations, getGame } from '../lib/utils';
import { clampLevel, emptySkills, normalizeSkills } from '../lib/skills';
import type {
  AppState, Rotation, Game, MoveSource, MoveTarget, StatsScope, SkillKey,
  PositionDef, PositionId, TeamMeta, TeamSettings, Player,
} from '../types';

// ── Initial State ────────────────────────────────────────────────────────────

export function makeInitialState(
  team: TeamMeta,
  players: Player[] = [],
  settings: TeamSettings = SPORTS[team.sport].defaultSettings,
): AppState {
  return {
    team,
    players,
    games: [],
    settings,
    curGame: '',
    statsScope: 'game',
    swapSel: null,
    isLoaded: false,
  };
}

export function newPositionId(): PositionId {
  return crypto.randomUUID().slice(0, 8);
}

export function newGame(name: string, settings: TeamSettings, createdAt = Date.now()): Game {
  return {
    id: crypto.randomUUID(),
    name,
    rotations: emptyRotations(settings.positions, settings.rotationCount),
    positions: settings.positions.map(p => ({ ...p })),
    scores: {},
    opponentScore: 0,
    completed: false,
    excludedPlayers: [],
    createdAt,
  };
}

// ── Actions ──────────────────────────────────────────────────────────────────

export type Action =
  | { type: 'ADD_PLAYER'; name: string }
  | { type: 'REMOVE_PLAYER'; index: number }
  | { type: 'RENAME_PLAYER'; index: number; newName: string }
  | { type: 'TOGGLE_ACTIVE'; index: number }
  | { type: 'SET_PLAYER_SKILL'; name: string; skill: SkillKey; level: number }
  | { type: 'SET_USE_SKILL_RATINGS'; enabled: boolean }
  | { type: 'SET_CUR_GAME'; id: string }
  | { type: 'ADD_GAME'; name: string }
  | { type: 'CLEAR_GAME'; gameId: string }
  | { type: 'SET_PLAYED'; gameId: string; rotIndex: number; played: boolean }
  | { type: 'TOGGLE_LOCK'; gameId: string; rotIndex: number; pos: PositionId; slotIndex: number }
  | { type: 'MOVE_PLAYER'; drag: MoveSource; target: MoveTarget }
  | { type: 'SET_SWAP_SEL'; swapSel: MoveSource | null }
  | { type: 'SET_SCORE'; playerName: string; gameId: string; count: number }
  | { type: 'SET_OPPONENT_SCORE'; gameId: string; score: number }
  | { type: 'COMPLETE_GAME'; gameId: string }
  | { type: 'SET_LINEUP'; gameId: string; rotations: Rotation[] }
  | { type: 'SET_STATS_SCOPE'; scope: StatsScope }
  | { type: 'RENAME_GAME'; gameId: string; name: string }
  | { type: 'DELETE_GAME'; gameId: string }
  | { type: 'TOGGLE_GAME_PLAYER_EXCLUDED'; gameId: string; playerName: string }
  | { type: 'ADD_POSITION'; name: string }
  | { type: 'UPDATE_POSITION'; id: PositionId; patch: Partial<Omit<PositionDef, 'id'>> }
  | { type: 'REMOVE_POSITION'; id: PositionId }
  | { type: 'SET_ROTATION_COUNT'; count: number }
  | { type: 'UPDATE_GAME_SETUP'; gameId: string; positions: PositionDef[]; rotationCount: number }
  | { type: 'RENAME_TEAM'; name: string }
  | { type: 'REMOTE_TEAM'; team: TeamMeta; players?: Player[]; settings?: TeamSettings }
  | { type: 'REMOTE_GAMES'; games: Game[]; pendingIds: string[] };

// ── Helpers ──────────────────────────────────────────────────────────────────

function updateGame<T extends keyof Game>(
  state: AppState,
  gameId: string,
  key: T,
  value: Game[T],
): AppState {
  const games = state.games.map(g =>
    g.id === gameId ? { ...g, [key]: value } : g
  );
  return { ...state, games };
}

function updateRotation(
  state: AppState,
  gameId: string,
  rotIndex: number,
  updater: (rot: Rotation) => Rotation,
): AppState {
  const games = state.games.map(g => {
    if (g.id !== gameId) return g;
    const rotations = g.rotations.map((r, ri) => ri === rotIndex ? updater({ ...r }) : r);
    return { ...g, rotations };
  });
  return { ...state, games };
}

/** Applies `fn` to every name in a rotation (slots + bench); null drops the name. */
function mapRotationNames(rot: Rotation, fn: (n: string) => string | null): Rotation {
  const slots: Rotation['slots'] = {};
  Object.entries(rot.slots).forEach(([pos, line]) => {
    slots[pos] = line.map(n => (n ? fn(n) : n));
  });
  const bench = rot.bench.map(fn).filter((n): n is string => !!n);
  return { ...rot, slots, bench };
}

function updateSettings(state: AppState, patch: Partial<TeamSettings>): AppState {
  return { ...state, settings: { ...state.settings, ...patch } };
}

function clampCount(n: number, max: number, min = 0): number {
  return Math.max(min, Math.min(max, Math.trunc(n) || 0));
}

/** Same position ids with the same slot counts, in the same order. */
function sameLineup(a: PositionDef[], b: PositionDef[]): boolean {
  return a.length === b.length && a.every((p, i) => p.id === b[i].id && p.count === b[i].count);
}

const byCreated = (a: Game, b: Game) => a.createdAt - b.createdAt;

// ── Reducer ──────────────────────────────────────────────────────────────────

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {

    case 'ADD_PLAYER': {
      const name = action.name.trim();
      if (!name || state.players.some(p => p.name === name)) return state;
      const player: Player = { name, active: true, skills: emptySkills(state.team.sport) };
      return { ...state, players: [...state.players, player] };
    }

    case 'REMOVE_PLAYER': {
      const name = state.players[action.index]?.name;
      if (!name) return state;
      const players = state.players.filter((_, i) => i !== action.index);
      const games = state.games.map(g => {
        const scores = { ...g.scores };
        delete scores[name];
        return {
          ...g,
          scores,
          excludedPlayers: g.excludedPlayers.filter(p => p !== name),
          rotations: g.rotations.map(rot => mapRotationNames(rot, n => (n === name ? null : n))),
        };
      });
      return { ...state, players, games };
    }

    case 'RENAME_PLAYER': {
      const old = state.players[action.index]?.name;
      const n = action.newName.trim();
      if (!old || !n || n === old || state.players.some(p => p.name === n)) return state;
      const players = state.players.map((p, i) =>
        i === action.index ? { ...p, name: n } : p
      );
      const games = state.games.map(g => {
        const scores = { ...g.scores };
        if (old in scores) { scores[n] = scores[old]; delete scores[old]; }
        return {
          ...g,
          scores,
          excludedPlayers: g.excludedPlayers.map(p => p === old ? n : p),
          rotations: g.rotations.map(rot => mapRotationNames(rot, x => (x === old ? n : x))),
        };
      });
      return { ...state, players, games };
    }

    case 'TOGGLE_ACTIVE': {
      const players = state.players.map((p, i) =>
        i === action.index ? { ...p, active: !p.active } : p
      );
      return { ...state, players };
    }

    // Keyed by name, not index: the player page is routed by name and has no roster index.
    case 'SET_PLAYER_SKILL': {
      const level = clampLevel(action.level);
      const sport = state.team.sport;
      const players = state.players.map(p =>
        p.name === action.name
          ? { ...p, skills: { ...normalizeSkills(p.skills, sport), [action.skill]: level } }
          : p
      );
      return { ...state, players };
    }

    case 'SET_USE_SKILL_RATINGS':
      return updateSettings(state, { useSkillRatings: action.enabled });

    case 'SET_CUR_GAME':
      return { ...state, curGame: action.id, swapSel: null };

    case 'ADD_GAME': {
      const name = action.name.trim() || `Game ${state.games.length + 1}`;
      // Strictly after every existing game so list order is stable even if clocks differ.
      const latest = state.games.reduce((a, g) => Math.max(a, g.createdAt), 0);
      const game = newGame(name, state.settings, Math.max(Date.now(), latest + 1));
      return { ...state, games: [...state.games, game], curGame: game.id, swapSel: null };
    }

    case 'CLEAR_GAME': {
      const game = getGame(state.games, action.gameId);
      if (!game) return state;
      return updateGame(state, action.gameId, 'rotations', emptyRotations(game.positions, game.rotations.length));
    }

    case 'SET_PLAYED':
      return updateRotation(state, action.gameId, action.rotIndex, rot => ({
        ...rot, played: action.played,
      }));

    case 'TOGGLE_LOCK':
      return updateRotation(state, action.gameId, action.rotIndex, rot => {
        const line = rot.locked[action.pos];
        if (!line) return rot;
        const locked = {
          ...rot.locked,
          [action.pos]: line.map((v, i) => i === action.slotIndex ? !v : v),
        };
        return { ...rot, locked };
      });

    case 'MOVE_PLAYER': {
      const { drag, target } = action;
      if (!drag.playerName) return state;

      const games = state.games.map(g => {
        if (g.id !== state.curGame) return g;
        const rotations = g.rotations.map((rot, ri) => {
          // Only process involved rotations (same rIdx for drag and target in our app)
          if (ri !== drag.rIdx && ri !== target.rIdx) return rot;

          const r = cloneRotation(rot);

          // Block drop onto a locked filled slot
          if (target.type === 'slot' && ri === target.rIdx) {
            const tLocked = r.locked[target.pos!]?.[target.sIdx!];
            const tName = r.slots[target.pos!]?.[target.sIdx!];
            if (tLocked && tName) return rot; // abort
          }

          let displaced: string | null = null;
          if (target.type === 'slot' && ri === target.rIdx) {
            displaced = r.slots[target.pos!][target.sIdx!];
          }

          // Clear source
          if (drag.type === 'slot' && ri === drag.rIdx) {
            r.slots[drag.pos!][drag.sIdx!] = null;
          } else if (drag.type === 'bench' && ri === drag.rIdx) {
            r.bench = r.bench.filter(p => p !== drag.playerName);
          }

          // Place in target
          if (target.type === 'slot' && ri === target.rIdx) {
            r.slots[target.pos!][target.sIdx!] = drag.playerName;
            if (displaced) {
              if (drag.type === 'slot' && drag.rIdx === target.rIdx) {
                // Swap within same rotation
                r.slots[drag.pos!][drag.sIdx!] = displaced;
              } else {
                if (!r.bench.includes(displaced)) r.bench.push(displaced);
              }
            }
          } else if (target.type === 'bench' && ri === target.rIdx) {
            if (!r.bench.includes(drag.playerName)) r.bench.push(drag.playerName);
          }

          return r;
        });
        return { ...g, rotations };
      });
      return { ...state, games };
    }

    case 'SET_SWAP_SEL':
      return { ...state, swapSel: action.swapSel };

    case 'SET_SCORE': {
      const game = getGame(state.games, action.gameId);
      if (!game) return state;
      const scores = { ...game.scores, [action.playerName]: Math.max(0, action.count) };
      return updateGame(state, action.gameId, 'scores', scores);
    }

    case 'SET_OPPONENT_SCORE':
      return updateGame(state, action.gameId, 'opponentScore', Math.max(0, action.score));

    case 'COMPLETE_GAME': {
      const game = getGame(state.games, action.gameId);
      if (!game) return state;
      return updateGame(state, action.gameId, 'completed', !game.completed);
    }

    case 'SET_LINEUP':
      return updateGame(state, action.gameId, 'rotations', action.rotations);

    case 'SET_STATS_SCOPE':
      return { ...state, statsScope: action.scope };

    case 'RENAME_GAME': {
      const game = getGame(state.games, action.gameId);
      if (!game) return state;
      return updateGame(state, action.gameId, 'name', action.name.trim() || game.name);
    }

    case 'DELETE_GAME': {
      const { gameId } = action;
      if (!getGame(state.games, gameId)) return state;
      const games = state.games.filter(g => g.id !== gameId);
      const curGame = state.curGame === gameId ? '' : state.curGame;
      return { ...state, games, curGame, swapSel: null };
    }

    case 'TOGGLE_GAME_PLAYER_EXCLUDED': {
      const game = getGame(state.games, action.gameId);
      if (!game) return state;
      const excludedPlayers = game.excludedPlayers.includes(action.playerName)
        ? game.excludedPlayers.filter(p => p !== action.playerName)
        : [...game.excludedPlayers, action.playerName];
      return updateGame(state, action.gameId, 'excludedPlayers', excludedPlayers);
    }

    // ── Team settings: the defaults for new games ──

    case 'ADD_POSITION': {
      const name = action.name.trim();
      if (!name) return state;
      const skill = positionSkills(state.team.sport)[0]?.key ?? '';
      const position: PositionDef = { id: newPositionId(), name, count: 1, skill };
      return updateSettings(state, { positions: [...state.settings.positions, position] });
    }

    case 'UPDATE_POSITION': {
      const patch = { ...action.patch };
      if (patch.name !== undefined) {
        patch.name = patch.name.trim();
        if (!patch.name) delete patch.name;
      }
      if (patch.count !== undefined) patch.count = clampCount(patch.count, MAX_POSITION_COUNT);
      const positions = state.settings.positions.map(p => p.id === action.id ? { ...p, ...patch } : p);
      return updateSettings(state, { positions });
    }

    case 'REMOVE_POSITION': {
      if (state.settings.positions.length <= 1) return state;
      return updateSettings(state, { positions: state.settings.positions.filter(p => p.id !== action.id) });
    }

    case 'SET_ROTATION_COUNT':
      return updateSettings(state, { rotationCount: clampCount(action.count, MAX_ROTATIONS, MIN_ROTATIONS) });

    // ── One game's lineup ──

    case 'UPDATE_GAME_SETUP': {
      const game = getGame(state.games, action.gameId);
      if (!game) return state;
      const count = clampCount(action.rotationCount, MAX_ROTATIONS, MIN_ROTATIONS);
      const positions = action.positions.map(p => ({ ...p, count: clampCount(p.count, MAX_POSITION_COUNT) }));

      let rotations: Rotation[];
      if (sameLineup(game.positions, positions)) {
        // Only the number of rotations changed: keep what's already been set up and
        // played, adding blank rotations or trimming from the end.
        rotations = game.rotations.slice(0, count).map(cloneRotation);
        while (rotations.length < count) rotations.push(emptyRotation(positions));
      } else {
        rotations = emptyRotations(positions, count);
      }
      const games = state.games.map(g => g.id === action.gameId ? { ...g, positions, rotations } : g);
      return { ...state, games };
    }

    case 'RENAME_TEAM': {
      const name = action.name.trim();
      if (!name) return state;
      return { ...state, team: { ...state.team, name } };
    }

    // ── From Firestore ──

    case 'REMOTE_TEAM':
      return {
        ...state,
        team: action.team,
        players: action.players ?? state.players,
        settings: action.settings ?? state.settings,
      };

    case 'REMOTE_GAMES': {
      // A game with a local edit not yet written keeps the local copy (or stays deleted);
      // everything else follows the server.
      const pending = new Set(action.pendingIds);
      const local = new Map(state.games.map(g => [g.id, g]));
      const games: Game[] = action.games.filter(g => !pending.has(g.id));
      pending.forEach(id => { const g = local.get(id); if (g) games.push(g); });
      games.sort(byCreated);
      return { ...state, games, isLoaded: true };
    }

    default:
      return state;
  }
}

// Convenience: auto-generate action creator
export function autoGenerateAction(state: AppState): Action {
  const rotations = autoGenerate(state);
  return { type: 'SET_LINEUP', gameId: state.curGame, rotations };
}
