export type SportId = 'soccer' | 'basketball';

/** Stable id of a position within a team (soccer's originals are 'def' | 'mid' | 'fwd'). */
export type PositionId = string;

/** 0 = unrated (shown as "–"), 1 = C, 2 = B, 3 = A. Numeric so the Stepper works as-is. */
export type SkillLevel = 0 | 1 | 2 | 3;
/** A skill key from the team's sport (see SPORTS[sport].skills). */
export type SkillKey = string;
export type PlayerSkills = Record<SkillKey, SkillLevel>;

export interface Player {
  name: string;
  active: boolean;
  skills: PlayerSkills;
}

/** One editable position line: "Defenders × 2", "Guards × 2", ... */
export interface PositionDef {
  id: PositionId;
  name: string;
  count: number;
  /** Which of the sport's skills governs this position (shown on the slot and used by the WEAK cap). */
  skill: SkillKey;
}

export interface Rotation {
  /** slots[positionId] = player name per slot (null = empty). Keyed to the game's `positions`. */
  slots: Record<PositionId, (string | null)[]>;
  locked: Record<PositionId, boolean[]>;
  bench: string[];
  played: boolean;
}

export interface TeamSettings {
  /** The default lineup for new games. Each game keeps its own snapshot. */
  positions: PositionDef[];
  /** Default number of rotations for new games. */
  rotationCount: number;
  /** When off, the lineup generator ignores skill ratings entirely (pre-ratings behaviour). */
  useSkillRatings: boolean;
  /** Strongest available group plays the final rotation (needs useSkillRatings). */
  strongFinish: boolean;
}

export interface Game {
  id: string;
  name: string;
  rotations: Rotation[];
  /** Positions in force for this game (copied from the team's settings when the game was created). */
  positions: PositionDef[];
  /** scores[playerName] = goals (soccer) or points (basketball) in this game. */
  scores: Record<string, number>;
  opponentScore: number;
  completed: boolean;
  excludedPlayers: string[];
  /** Ordering key — games are listed oldest first. */
  createdAt: number;
}

export interface TeamMeta {
  id: string;
  name: string;
  sport: SportId;
  ownerUid: string;
  memberUids: string[];
  /** uid → display name, written by each coach for themselves. */
  memberNames: Record<string, string>;
  joinCode: string;
}

export type StatsScope = 'game' | 'season';

export interface PlayerStats {
  /** Rotations spent in each position, keyed by position id. */
  byPos: Record<PositionId, number>;
  total: number;
  /** Goals or points. */
  score: number;
}

export type StatsMap = Record<string, PlayerStats>;

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error';

// A player picked up to move: a bench player, or a field player (pos + sIdx set).
export interface MoveSource {
  type: 'slot' | 'bench';
  rIdx: number;
  playerName: string;
  pos?: PositionId;
  sIdx?: number;
}

export interface MoveTarget {
  type: 'slot' | 'bench';
  rIdx: number;
  pos?: PositionId;
  sIdx?: number;
}

/** State for the one team currently open. */
export interface AppState {
  team: TeamMeta;
  players: Player[];
  games: Game[];
  settings: TeamSettings;
  curGame: string;
  statsScope: StatsScope;
  swapSel: MoveSource | null;
  /** True once both the team document and its games have arrived from Firestore. */
  isLoaded: boolean;
}
