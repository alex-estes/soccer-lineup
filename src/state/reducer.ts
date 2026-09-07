import { DEFAULT_FORMATION, POSITIONS } from '../constants';
import { autoGenerate } from '../lib/autoGenerate';
import { emptyRotations, getGame } from '../lib/utils';
import { migrateLegacyState, type LegacyDoc } from './migrateLegacyState';
import type {
  AppState, Position, Rotation, Goals, Game,
  DragSource, DropTarget, SwapSel, SlotMenuSel, StatsScope, FormationSettings,
} from '../types';

// ── Initial State ────────────────────────────────────────────────────────────

const initialGameId = crypto.randomUUID();

export const initialState: AppState = {
  players: [],
  goals: {},
  games: [{
    id: initialGameId,
    name: 'Game 1',
    rotations: emptyRotations(DEFAULT_FORMATION),
    opponentScore: 0,
    completed: false,
    excludedPlayers: [],
    formation: DEFAULT_FORMATION,
  }],
  curGame: initialGameId,
  settings: { defaultFormation: DEFAULT_FORMATION },
  statsScope: 'game',
  swapSel: null,
  slotMenuSel: null,
  isLoaded: false,
  schemaVersion: 2,
};

// ── Actions ──────────────────────────────────────────────────────────────────

export type Action =
  | { type: 'ADD_PLAYER'; name: string }
  | { type: 'REMOVE_PLAYER'; index: number }
  | { type: 'RENAME_PLAYER'; index: number; newName: string }
  | { type: 'TOGGLE_ACTIVE'; index: number }
  | { type: 'SET_CUR_GAME'; id: string }
  | { type: 'ADD_GAME'; name: string }
  | { type: 'CLEAR_GAME'; gameId: string }
  | { type: 'SET_PLAYED'; gameId: string; rotIndex: number; played: boolean }
  | { type: 'TOGGLE_LOCK'; gameId: string; rotIndex: number; pos: Position; slotIndex: number }
  | { type: 'DROP_PLAYER'; drag: DragSource; target: DropTarget }
  | { type: 'SET_SWAP_SEL'; swapSel: SwapSel | null }
  | { type: 'SET_SLOT_MENU'; slotMenuSel: SlotMenuSel | null }
  | { type: 'SET_GOALS'; playerName: string; gameId: string; count: number }
  | { type: 'SET_OPPONENT_SCORE'; gameId: string; score: number }
  | { type: 'COMPLETE_GAME'; gameId: string }
  | { type: 'SET_LINEUP'; gameId: string; rotations: Rotation[] }
  | { type: 'SET_STATS_SCOPE'; scope: StatsScope }
  | { type: 'RENAME_GAME'; gameId: string; name: string }
  | { type: 'DELETE_GAME'; gameId: string }
  | { type: 'TOGGLE_GAME_PLAYER_EXCLUDED'; gameId: string; playerName: string }
  | { type: 'UPDATE_FORMATION'; formation: FormationSettings }
  | { type: 'UPDATE_GAME_FORMATION'; gameId: string; formation: FormationSettings }
  | { type: 'RESET_ALL' }
  | { type: 'LOAD_FROM_FIREBASE'; data: LegacyDoc };

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

// ── Reducer ──────────────────────────────────────────────────────────────────

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {

    case 'ADD_PLAYER': {
      const name = action.name.trim();
      if (!name || state.players.some(p => p.name === name)) return state;
      return { ...state, players: [...state.players, { name, active: true }] };
    }

    case 'REMOVE_PLAYER': {
      const name = state.players[action.index]?.name;
      if (!name) return state;
      const players = state.players.filter((_, i) => i !== action.index);
      const goals: Goals = { ...state.goals };
      delete goals[name];
      const games = state.games.map(g => ({
        ...g,
        excludedPlayers: g.excludedPlayers.filter(p => p !== name),
        rotations: g.rotations.map(rot => {
          const updated: Rotation = { ...rot };
          POSITIONS.forEach(pos => {
            updated[pos] = updated[pos].map(p => p === name ? null : p);
          });
          updated.bench = updated.bench.filter(p => p !== name);
          return updated;
        }),
      }));
      return { ...state, players, goals, games };
    }

    case 'RENAME_PLAYER': {
      const old = state.players[action.index]?.name;
      const n = action.newName.trim();
      if (!old || !n || n === old || state.players.some(p => p.name === n)) return state;
      const players = state.players.map((p, i) =>
        i === action.index ? { ...p, name: n } : p
      );
      const goals: Goals = { ...state.goals };
      if (goals[old]) { goals[n] = goals[old]; delete goals[old]; }
      const games = state.games.map(g => ({
        ...g,
        excludedPlayers: g.excludedPlayers.map(p => p === old ? n : p),
        rotations: g.rotations.map(rot => {
          const updated: Rotation = { ...rot };
          POSITIONS.forEach(pos => {
            updated[pos] = updated[pos].map(p => p === old ? n : p);
          });
          updated.bench = updated.bench.map(p => p === old ? n : p);
          return updated;
        }),
      }));
      return { ...state, players, goals, games };
    }

    case 'TOGGLE_ACTIVE': {
      const players = state.players.map((p, i) =>
        i === action.index ? { ...p, active: !p.active } : p
      );
      return { ...state, players };
    }

    case 'SET_CUR_GAME':
      return { ...state, curGame: action.id, swapSel: null, slotMenuSel: null };

    case 'ADD_GAME': {
      const name = action.name.trim() || `Game ${state.games.length + 1}`;
      const id = crypto.randomUUID();
      const formation: FormationSettings = state.settings.defaultFormation;
      const newGame: Game = {
        id, name,
        rotations: emptyRotations(formation),
        opponentScore: 0,
        completed: false,
        excludedPlayers: [],
        formation,
      };
      return { ...state, games: [...state.games, newGame], curGame: id, swapSel: null, slotMenuSel: null };
    }

    case 'CLEAR_GAME': {
      const game = getGame(state.games, action.gameId);
      if (!game) return state;
      return updateGame(state, action.gameId, 'rotations', emptyRotations(game.formation));
    }

    case 'SET_PLAYED':
      return updateRotation(state, action.gameId, action.rotIndex, rot => ({
        ...rot, played: action.played,
      }));

    case 'TOGGLE_LOCK':
      return updateRotation(state, action.gameId, action.rotIndex, rot => {
        const locked = {
          ...rot.locked,
          [action.pos]: rot.locked[action.pos].map((v, i) =>
            i === action.slotIndex ? !v : v
          ),
        };
        return { ...rot, locked };
      });

    case 'DROP_PLAYER': {
      const { drag, target } = action;
      if (!drag.playerName) return state;

      const games = state.games.map(g => {
        if (g.id !== state.curGame) return g;
        const rotations = g.rotations.map((rot, ri) => {
          // Only process involved rotations (same rIdx for drag and target in our app)
          if (ri !== drag.rIdx && ri !== target.rIdx) return rot;

          const r: Rotation = {
            ...rot,
            def: [...rot.def],
            mid: [...rot.mid],
            fwd: [...rot.fwd],
            bench: [...rot.bench],
            locked: { ...rot.locked },
          };

          // Block drop onto a locked filled slot
          if (target.type === 'slot' && ri === target.rIdx) {
            const tLocked = r.locked[target.pos!][target.sIdx!];
            const tName = r[target.pos!][target.sIdx!];
            if (tLocked && tName) return rot; // abort
          }

          let displaced: string | null = null;
          if (target.type === 'slot' && ri === target.rIdx) {
            displaced = r[target.pos!][target.sIdx!];
          }

          // Clear source
          if (drag.type === 'slot' && ri === drag.rIdx) {
            r[drag.pos!][drag.sIdx!] = null;
          } else if (drag.type === 'bench' && ri === drag.rIdx) {
            r.bench = r.bench.filter(p => p !== drag.playerName);
          }

          // Place in target
          if (target.type === 'slot' && ri === target.rIdx) {
            r[target.pos!][target.sIdx!] = drag.playerName;
            if (displaced) {
              if (drag.type === 'slot' && drag.rIdx === target.rIdx) {
                // Swap within same rotation
                r[drag.pos!][drag.sIdx!] = displaced;
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

    case 'SET_SLOT_MENU':
      return { ...state, slotMenuSel: action.slotMenuSel };

    case 'SET_GOALS': {
      const goals: Goals = { ...state.goals };
      if (!goals[action.playerName]) goals[action.playerName] = {};
      goals[action.playerName] = { ...goals[action.playerName], [action.gameId]: Math.max(0, action.count) };
      return { ...state, goals };
    }

    case 'SET_OPPONENT_SCORE': {
      const score = Math.max(0, action.score);
      return updateGame(state, action.gameId, 'opponentScore', score);
    }

    case 'COMPLETE_GAME': {
      const games = state.games.map(g =>
        g.id === action.gameId ? { ...g, completed: !g.completed } : g
      );
      return { ...state, games };
    }

    case 'SET_LINEUP':
      return updateGame(state, action.gameId, 'rotations', action.rotations);

    case 'SET_STATS_SCOPE':
      return { ...state, statsScope: action.scope };

    case 'RENAME_GAME': {
      const games = state.games.map(g =>
        g.id === action.gameId ? { ...g, name: action.name.trim() || g.name } : g
      );
      return { ...state, games };
    }

    case 'DELETE_GAME': {
      if (state.games.length <= 1) return state;
      const { gameId } = action;
      const deletedIdx = state.games.findIndex(g => g.id === gameId);
      if (deletedIdx === -1) return state;
      const games = state.games.filter(g => g.id !== gameId);

      // Goals are keyed by stable game id, so deleting a game only means
      // dropping that one key — no reindexing of other games' goals needed.
      const goals: Goals = {};
      Object.entries(state.goals).forEach(([player, gameGoals]) => {
        goals[player] = Object.fromEntries(
          Object.entries(gameGoals).filter(([id]) => id !== gameId)
        );
      });

      let curGame = state.curGame;
      if (curGame === gameId) {
        curGame = games[Math.max(0, deletedIdx - 1)]?.id ?? games[0]?.id ?? '';
      }

      return { ...state, games, goals, curGame, swapSel: null, slotMenuSel: null };
    }

    case 'TOGGLE_GAME_PLAYER_EXCLUDED': {
      const game = getGame(state.games, action.gameId);
      if (!game) return state;
      const excludedPlayers = game.excludedPlayers.includes(action.playerName)
        ? game.excludedPlayers.filter(p => p !== action.playerName)
        : [...game.excludedPlayers, action.playerName];
      return updateGame(state, action.gameId, 'excludedPlayers', excludedPlayers);
    }

    case 'UPDATE_FORMATION':
      return { ...state, settings: { ...state.settings, defaultFormation: action.formation } };

    case 'UPDATE_GAME_FORMATION':
      return updateGame(state, action.gameId, 'formation', action.formation);

    case 'RESET_ALL':
      return { ...initialState, isLoaded: true };

    case 'LOAD_FROM_FIREBASE': {
      const migrated = migrateLegacyState(action.data, state);
      return { ...state, ...migrated, isLoaded: true };
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
