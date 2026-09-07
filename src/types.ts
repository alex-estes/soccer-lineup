export type Position = 'def' | 'mid' | 'fwd';

export interface Player {
  name: string;
  active: boolean;
}

export interface LockedSlots {
  def: boolean[];
  mid: boolean[];
  fwd: boolean[];
}

export interface Rotation {
  def: (string | null)[];
  mid: (string | null)[];
  fwd: (string | null)[];
  bench: string[];
  played: boolean;
  locked: LockedSlots;
}

export interface FormationSettings {
  playersOnField: number;
  defenders: number;
  midfielders: number;
  forwards: number;
}

export interface AppSettings {
  defaultFormation: FormationSettings;
}

export interface Game {
  id: string;
  name: string;
  rotations: Rotation[];
  opponentScore: number;
  completed: boolean;
  excludedPlayers: string[];
  formation: FormationSettings;
}

// goals[playerName][gameId] = count
export type Goals = Record<string, Record<string, number>>;

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
  curGame: string;
  settings: AppSettings;
  statsScope: StatsScope;
  swapSel: SwapSel | null;
  slotMenuSel: SlotMenuSel | null;
  isLoaded: boolean;
  schemaVersion: number;
}
