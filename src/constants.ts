import type { Position } from './types';

export const POSITIONS: Position[] = ['def', 'mid', 'fwd'];
export const POS_LABELS: Record<Position, string> = { def: 'Defenders', mid: 'Midfielders', fwd: 'Forwards' };
export const POS_COLORS: Record<Position, string> = { def: 'var(--def)', mid: 'var(--mid)', fwd: 'var(--fwd)' };
export const SLOTS_PER = 2;
export const NUM_ROT = 6;
export const FIELD_SIZE = 6;

export const DEFAULT_PLAYERS = [
  'Alex', 'Jordan', 'Sam', 'Riley', 'Casey', 'Morgan', 'Taylor', 'Quinn', 'Drew', 'Avery', 'Blake',
];
