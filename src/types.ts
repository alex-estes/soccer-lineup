export type Position = 'def' | 'mid' | 'fwd';

export interface Player {
  name: string;
  active: boolean;
}

export interface LockedSlots {
  def: [boolean, boolean];
  mid: [boolean, boolean];
  fwd: [boolean, boolean];
}

export interface Rotation {
  def: [string | null, string | null];
  mid: [string | null, string | null];
  fwd: [string | null, string | null];
  bench: string[];
  played: boolean;
  locked: LockedSlots;
}

export interface Game {
  name: string;
  rotations: Rotation[];
  opponentScore: number;
  completed: boolean;
}

// goals[playerName][gameIndex] = count
export type Goals = Record<string, Record<number, number>>;

export type StatsScope = 'game' | 'season';

export interface PlayerStats {
  def: number;
  mid: number;
  fwd: number;
  total: number;
  goals: number;
}

export type StatsMap = Record<string, PlayerStats>;

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface SwapSel {
  rIdx: number;
  playerName: string;
}

export interface SlotMenuSel {
  rIdx: number;
  pos: Position;
  sIdx: number;
}

export interface DragSource {
  type: 'slot' | 'bench';
  rIdx: number;
  playerName: string;
  pos?: Position;
  sIdx?: number;
}

export interface DropTarget {
  type: 'slot' | 'bench';
  rIdx: number;
  pos?: Position;
  sIdx?: number;
}

export interface AppState {
  players: Player[];
  goals: Goals;
  games: Game[];
  curGame: number;
  statsScope: StatsScope;
  swapSel: SwapSel | null;
  slotMenuSel: SlotMenuSel | null;
  isLoaded: boolean;
}
