import type { FormationSettings, Position } from './types';

export const POSITIONS: Position[] = ['def', 'mid', 'fwd'];
export const POS_LABELS: Record<Position, string> = { def: 'Defenders', mid: 'Midfielders', fwd: 'Forwards' };
// Matches the D/M/F color coding used everywhere else (stats table headers, etc.)
export const POS_COLORS: Record<Position, string> = {
  def: 'var(--blue-400)',
  mid: 'var(--color-warning)',
  fwd: 'var(--color-danger)',
};
export const NUM_ROT = 6;

// Formation matches today's hardcoded 2 def / 2 mid / 2 fwd (6 on field) exactly —
// used as the initial default and as the migration fallback for pre-formation data.
export const DEFAULT_FORMATION: FormationSettings = {
  playersOnField: 6,
  defenders: 2,
  midfielders: 2,
  forwards: 2,
};
