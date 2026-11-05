import type { PositionDef, SkillKey, SportId, TeamSettings } from './types';

export interface SkillDef {
  key: SkillKey;
  label: string;
  group: 'hard' | 'soft';
}

export interface SportConfig {
  id: SportId;
  label: string;
  /** What a player's score is called: "Goals" / "Points". */
  scoreLabel: string;
  skills: SkillDef[];
  defaultSettings: TeamSettings;
}

// Soccer's position ids stay 'def' | 'mid' | 'fwd' so data from before positions were
// editable maps onto them one to one.
const SOCCER_POSITIONS: PositionDef[] = [
  { id: 'def', name: 'Defenders', count: 2, skill: 'defense' },
  { id: 'mid', name: 'Midfielders', count: 2, skill: 'offense' },
  { id: 'fwd', name: 'Forwards', count: 2, skill: 'offense' },
];

const BASKETBALL_POSITIONS: PositionDef[] = [
  { id: 'guard', name: 'Guards', count: 2, skill: 'overall' },
  { id: 'forward', name: 'Forwards', count: 2, skill: 'overall' },
  { id: 'center', name: 'Center', count: 1, skill: 'overall' },
];

export const SPORTS: Record<SportId, SportConfig> = {
  soccer: {
    id: 'soccer',
    label: 'Soccer',
    scoreLabel: 'Goals',
    skills: [
      { key: 'defense', label: 'Defense', group: 'hard' },
      { key: 'offense', label: 'Offense', group: 'hard' },
      { key: 'teamwork', label: 'Teamwork', group: 'soft' },
      { key: 'kindness', label: 'Kindness', group: 'soft' },
    ],
    defaultSettings: { positions: SOCCER_POSITIONS, rotationCount: 6, useSkillRatings: true, strongFinish: true },
  },
  basketball: {
    id: 'basketball',
    label: 'Basketball',
    scoreLabel: 'Points',
    skills: [{ key: 'overall', label: 'Overall', group: 'hard' }],
    defaultSettings: { positions: BASKETBALL_POSITIONS, rotationCount: 8, useSkillRatings: true, strongFinish: true },
  },
};

export const SPORT_IDS: SportId[] = ['soccer', 'basketball'];

export function isSportId(v: unknown): v is SportId {
  return v === 'soccer' || v === 'basketball';
}

/** Skills that can govern a position (the "hard" ones). */
export function positionSkills(sport: SportId): SkillDef[] {
  return SPORTS[sport].skills.filter(s => s.group === 'hard');
}

export const MIN_ROTATIONS = 1;
export const MAX_ROTATIONS = 20;
export const MAX_POSITION_COUNT = 11;

// Colour per position, by its index in the lineup. The first three match the D/M/F
// colour coding soccer has always used.
const POS_PALETTE = [
  'var(--blue-400)',
  'var(--color-warning)',
  'var(--color-danger)',
  'var(--teal-400)',
  'var(--red-300)',
  'var(--neutral-300)',
];

export function positionColor(index: number): string {
  return POS_PALETTE[index % POS_PALETTE.length];
}

/** Total players on the field / court for a set of positions. */
export function playersOnField(positions: PositionDef[]): number {
  return positions.reduce((a, p) => a + p.count, 0);
}

/**
 * Short column headers for the stats table: the first letter of each name, lengthened
 * only as far as needed to tell two positions apart (Forwards / Fullbacks → FO / FU).
 */
export function positionAbbrevs(positions: PositionDef[]): Record<string, string> {
  const out: Record<string, string> = {};
  const names = positions.map(p => (p.name.trim() || '?').toUpperCase());
  positions.forEach((p, i) => {
    let len = 1;
    while (
      len < names[i].length &&
      names.some((other, j) => j !== i && other.slice(0, len) === names[i].slice(0, len))
    ) len++;
    out[p.id] = names[i].slice(0, Math.min(len, 3));
  });
  return out;
}
