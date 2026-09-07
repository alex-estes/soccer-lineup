import type { FormationSettings, Position } from './types';

export const POSITIONS: Position[] = ['def', 'mid', 'fwd'];
export const POS_LABELS: Record<Position, string> = { def: 'Defenders', mid: 'Midfielders', fwd: 'Forwards' };
export const POS_COLORS: Record<Position, string> = { def: 'var(--def)', mid: 'var(--mid)', fwd: 'var(--fwd)' };
export const NUM_ROT = 6;

// Formation matches today's hardcoded 2 def / 2 mid / 2 fwd (6 on field) exactly —
// used as the initial default and as the migration fallback for pre-formation data.
export const DEFAULT_FORMATION: FormationSettings = {
  playersOnField: 6,
  defenders: 2,
  midfielders: 2,
  forwards: 2,
};
