import { POSITIONS } from '../constants';
import { autoGenerate } from '../lib/autoGenerate';
import { ensureShape, emptyRotations } from '../lib/utils';
import type {
  AppState, Player, Position, Rotation, Goals,
  DragSource, DropTarget, SwapSel, SlotMenuSel, StatsScope,
} from '../types';

// ── Initial State ────────────────────────────────────────────────────────────

export const initialState: AppState = {
  players: [],
  goals: {},
  games: [{ name: 'Game 1', rotations: emptyRotations(), opponentScore: 0, completed: false }],
  curGame: 0,
  statsScope: 'game',
  swapSel: null,
  slotMenuSel: null,
  isLoaded: false,
};

// ── Actions ──────────────────────────────────────────────────────────────────

export type Action =
  | { type: 'ADD_PLAYER'; name: string }
  | { type: 'REMOVE_PLAYER'; index: number }
  | { type: 'RENAME_PLAYER'; index: number; newName: string }
  | { type: 'TOGGLE_ACTIVE'; index: number }
  | { type: 'SET_CUR_GAME'; index: number }
  | { type: 'ADD_GAME'; name: string }
  | { type: 'CLEAR_GAME'; gameIndex: number }
  | { type: 'SET_PLAYED'; gameIndex: number; rotIndex: number; played: boolean }
  | { type: 'TOGGLE_LOCK'; gameIndex: number; rotIndex: number; pos: Position; slotIndex: number }
  | { type: 'DROP_PLAYER'; drag: DragSource; target: DropTarget }
  | { type: 'SET_SWAP_SEL'; swapSel: SwapSel | null }
  | { type: 'SET_SLOT_MENU'; slotMenuSel: SlotMenuSel | null }
  | { type: 'SET_GOALS'; playerName: string; gameIndex: number; count: number }
  | { type: 'SET_OPPONENT_SCORE'; gameIndex: number; score: number }
  | { type: 'COMPLETE_GAME'; gameIndex: number }
  | { type: 'SET_LINEUP'; gameIndex: number; rotations: Rotation[] }
  | { type: 'SET_STATS_SCOPE'; scope: StatsScope }
  | { type: 'RENAME_GAME'; gameIndex: number; name: string }
  | { type: 'DELETE_GAME'; gameIndex: number }
  | { type: 'LOAD_FROM_FIREBASE'; data: Partial<{ players: unknown; goals: unknown; games: unknown; curGame: unknown }> };

// ── Helpers ──────────────────────────────────────────────────────────────────

function updateGame<T extends keyof AppState['games'][number]>(
  state: AppState,
  gameIndex: number,
  key: T,
  value: AppState['games'][number][T],
): AppState {
  const games = state.games.map((g, i) =>
    i === gameIndex ? { ...g, [key]: value } : g
  );
  return { ...state, games };
}

function updateRotation(
  state: AppState,
  gameIndex: number,
  rotIndex: number,
  updater: (rot: Rotation) => Rotation,
): AppState {
  const games = state.games.map((g, gi) => {
    if (gi !== gameIndex) return g;
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
        rotations: g.rotations.map(rot => {
          ensureShape(rot);
          const updated: Rotation = { ...rot };
          POSITIONS.forEach(pos => {
            updated[pos] = updated[pos].map(p => p === name ? null : p) as [string | null, string | null];
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
        rotations: g.rotations.map(rot => {
          const updated: Rotation = { ...rot };
          POSITIONS.forEach(pos => {
            updated[pos] = updated[pos].map(p => p === old ? n : p) as [string | null, string | null];
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
      return { ...state, curGame: action.index, swapSel: null, slotMenuSel: null };

    case 'ADD_GAME': {
      const name = action.name.trim() || `Game ${state.games.length + 1}`;
      const games = [...state.games, { name, rotations: emptyRotations(), opponentScore: 0, completed: false }];
      return { ...state, games, curGame: games.length - 1, swapSel: null, slotMenuSel: null };
    }

    case 'CLEAR_GAME':
      return updateGame(state, action.gameIndex, 'rotations', emptyRotations());

    case 'SET_PLAYED':
      return updateRotation(state, action.gameIndex, action.rotIndex, rot => ({
        ...rot, played: action.played,
      }));

    case 'TOGGLE_LOCK':
      return updateRotation(state, action.gameIndex, action.rotIndex, rot => {
        const locked = {
          ...rot.locked,
          [action.pos]: rot.locked[action.pos].map((v, i) =>
            i === action.slotIndex ? !v : v
          ) as [boolean, boolean],
        };
        return { ...rot, locked };
      });

    case 'DROP_PLAYER': {
      const { drag, target } = action;
      if (!drag.playerName) return state;

      const games = state.games.map((g, gi) => {
        if (gi !== state.curGame) return g;
        const rotations = g.rotations.map((rot, ri) => {
          // Only process involved rotations (same rIdx for drag and target in our app)
          if (ri !== drag.rIdx && ri !== target.rIdx) return rot;

          const r: Rotation = {
            ...rot,
            def: [...rot.def] as [string | null, string | null],
            mid: [...rot.mid] as [string | null, string | null],
            fwd: [...rot.fwd] as [string | null, string | null],
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
      goals[action.playerName] = { ...goals[action.playerName], [action.gameIndex]: Math.max(0, action.count) };
      return { ...state, goals };
    }

    case 'SET_OPPONENT_SCORE': {
      const score = Math.max(0, action.score);
      return updateGame(state, action.gameIndex, 'opponentScore', score);
    }

    case 'COMPLETE_GAME': {
      const games = state.games.map((g, i) =>
        i === action.gameIndex ? { ...g, completed: !g.completed } : g
      );
      return { ...state, games };
    }

    case 'SET_LINEUP':
      return updateGame(state, action.gameIndex, 'rotations', action.rotations);

    case 'SET_STATS_SCOPE':
      return { ...state, statsScope: action.scope };

    case 'RENAME_GAME': {
      const games = state.games.map((g, i) =>
        i === action.gameIndex ? { ...g, name: action.name.trim() || g.name } : g
      );
      return { ...state, games };
    }

    case 'DELETE_GAME': {
      if (state.games.length <= 1) return state;
      const { gameIndex } = action;
      const games = state.games.filter((_, i) => i !== gameIndex);

      // Shift goal game-indices for games after the deleted one
      const goals: Goals = {};
      Object.entries(state.goals).forEach(([player, gameGoals]) => {
        const shifted: Record<number, number> = {};
        Object.entries(gameGoals).forEach(([gIdx, count]) => {
          const idx = Number(gIdx);
          if (idx < gameIndex) shifted[idx] = count;
          else if (idx > gameIndex) shifted[idx - 1] = count;
          // idx === gameIndex: dropped
        });
        goals[player] = shifted;
      });

      let curGame = state.curGame;
      if (gameIndex === curGame) curGame = Math.max(0, gameIndex - 1);
      else if (gameIndex < curGame) curGame -= 1;

      return { ...state, games, goals, curGame, swapSel: null, slotMenuSel: null };
    }

    case 'LOAD_FROM_FIREBASE': {
      const { data } = action;
      let players: Player[] = state.players;
      let goals: Goals = state.goals;
      let games = state.games;
      let curGame = state.curGame;

      if (Array.isArray(data.players)) {
        players = (data.players as unknown[]).map(p =>
          typeof p === 'string'
            ? { name: p, active: true }
            : { name: (p as Player).name || String(p), active: (p as Player).active !== false }
        );
      }
      if (data.goals && typeof data.goals === 'object') {
        goals = data.goals as Goals;
      }
      if (Array.isArray(data.games)) {
        games = (data.games as unknown[]).map(g => {
          const game = g as AppState['games'][number];
          return {
            ...game,
            opponentScore: game.opponentScore || 0,
            completed: game.completed || false,
            rotations: (game.rotations || []).map(r => {
              ensureShape(r);
              const sanitized: Rotation = { ...r };
              POSITIONS.forEach(pos => {
                sanitized[pos] = sanitized[pos].map(p => {
                  if (!p) return null;
                  return typeof p === 'string' ? p : ((p as { name?: string }).name || null);
                }) as [string | null, string | null];
              });
              sanitized.bench = sanitized.bench
                .map(p => typeof p === 'string' ? p : ((p as { name?: string }).name || null))
                .filter(Boolean) as string[];
              return sanitized;
            }),
          };
        });
      }
      if (typeof data.curGame === 'number') {
        curGame = data.curGame;
      }

      return { ...state, players, goals, games, curGame, isLoaded: true };
    }

    default:
      return state;
  }
}

// Convenience: auto-generate action creator
export function autoGenerateAction(state: AppState): Action {
  const rotations = autoGenerate(state);
  return { type: 'SET_LINEUP', gameIndex: state.curGame, rotations };
}
