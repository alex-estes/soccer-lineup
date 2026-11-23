import type { PositionDef, SkillKey, SkillLevel, SportId, TeamSettings } from './types';

export interface SkillDef {
  key: SkillKey;
  label: string;
  /** Three-letter tag used where space is tight (the roster cards). */
  abbr: string;
  group: 'hard' | 'soft';
}

/** How a rating level is drawn: soccer's C/B/A letters or basketball's medals. */
export type RatingStyle = 'letter' | 'medal';

/**
 * Rules about the whole group on the floor in a rotation, on top of the per-position
 * weak cap. Basketball has them: five players share every job, so the group matters more
 * than who stands where. All are best effort — the generator never breaks playing time
 * or the no-back-to-back-bench rule to satisfy them.
 */
export interface LineupRules {
  /** Rated → this skill alone is a player's strength for the strong finish and the cap below. */
  strengthSkill: SkillKey;
  /** Most players at the lowest level (by strength) on the floor at once. */
  maxWeakOnFloor: number;
  /** Someone on the floor must be at least `minLevel` here. Unrated counts as the middle level. */
  handler: { skill: SkillKey; minLevel: SkillLevel };
  /** Rotation totals of these skills are kept even across the game, as well as strength. */
  balance: SkillKey[];
}

export interface SportConfig {
  id: SportId;
  label: string;
  /** What a player's score is called: "Goals" / "Points". */
  scoreLabel: string;
  ratingStyle: RatingStyle;
  skills: SkillDef[];
  /**
   * Read in place of any other skill a player hasn't been rated on yet (basketball:
   * Overall), so a coach can rate Overall alone and fill in offense/defense over time.
   */
  fallbackSkill?: SkillKey;
  lineupRules?: LineupRules;
  defaultSettings: TeamSettings;
}

// Soccer's position ids stay 'def' | 'mid' | 'fwd' so data from before positions were
// editable maps onto them one to one.
const SOCCER_POSITIONS: PositionDef[] = [
  { id: 'def', name: 'Defenders', count: 2, skill: 'defense' },
  { id: 'mid', name: 'Midfielders', count: 2, skill: 'offense' },
  { id: 'fwd', name: 'Forwards', count: 2, skill: 'offense' },
];

// Guards bring the ball up and run the offense; the center rebounds and protects the
// rim; forwards do a bit of everything. Only new teams get these — each team keeps its own.
const BASKETBALL_POSITIONS: PositionDef[] = [
  { id: 'guard', name: 'Guards', count: 2, skill: 'offense' },
  { id: 'forward', name: 'Forwards', count: 2, skill: 'overall' },
  { id: 'center', name: 'Center', count: 1, skill: 'defense' },
];

export const SPORTS: Record<SportId, SportConfig> = {
  soccer: {
    id: 'soccer',
    label: 'Soccer',
    scoreLabel: 'Goals',
    ratingStyle: 'letter',
    skills: [
      { key: 'defense', label: 'Defense', abbr: 'DEF', group: 'hard' },
      { key: 'offense', label: 'Offense', abbr: 'OFF', group: 'hard' },
      { key: 'teamwork', label: 'Teamwork', abbr: 'TMW', group: 'soft' },
      { key: 'kindness', label: 'Kindness', abbr: 'KND', group: 'soft' },
    ],
    defaultSettings: { positions: SOCCER_POSITIONS, rotationCount: 6, useSkillRatings: true, strongFinish: true },
  },
  basketball: {
    id: 'basketball',
    label: 'Basketball',
    scoreLabel: 'Points',
    ratingStyle: 'medal',
    // Overall stays first: it is what every default position is rated by, and existing
    // players' Overall ratings carry over unchanged (1/2/3 → Bronze/Silver/Gold).
    skills: [
      { key: 'overall', label: 'Overall', abbr: 'OVR', group: 'hard' },
      { key: 'offense', label: 'Offense', abbr: 'OFF', group: 'hard' },
      { key: 'defense', label: 'Defense', abbr: 'DEF', group: 'hard' },
    ],
    fallbackSkill: 'overall',
    lineupRules: {
      strengthSkill: 'overall',
      // Never more than two Bronze of five: a developing player always has stronger
      // teammates around them.
      maxWeakOnFloor: 2,
      // Always someone who can bring the ball up.
      handler: { skill: 'offense', minLevel: 2 },
      balance: ['offense', 'defense'],
    },
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
