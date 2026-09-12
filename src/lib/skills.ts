import type { Player, PlayerSkills, Position, Rotation, SkillKey, SkillLevel } from '../types';

export const SKILL_KEYS: SkillKey[] = ['defense', 'offense', 'teamwork', 'kindness'];
export const SKILL_MIN = 0;
export const SKILL_MAX = 3;
/** The level the lineup generator treats as "weak". Unrated (0) is deliberately NOT weak. */
export const SKILL_LOW: SkillLevel = 1;
/** Level used for an unrated player when averaging — neutral, i.e. the same as a B. */
export const SKILL_NEUTRAL = 2;

export const SKILL_LABELS: Record<SkillKey, string> = {
  defense: 'Defense',
  offense: 'Offense',
  teamwork: 'Teamwork',
  kindness: 'Kindness',
};

// Same en-dash (U+2013) the stats table uses for an empty cell.
const LETTERS = ['–', 'C', 'B', 'A'] as const;

export function skillLetter(level: number): string {
  return LETTERS[Math.min(SKILL_MAX, Math.max(SKILL_MIN, Math.trunc(level || 0)))];
}

export const EMPTY_SKILLS: PlayerSkills = { defense: 0, offense: 0, teamwork: 0, kindness: 0 };

export function clampLevel(v: unknown): SkillLevel {
  const n = typeof v === 'number' ? Math.trunc(v) : Number(v);
  if (!Number.isFinite(n) || n < SKILL_MIN) return 0;
  return (n > SKILL_MAX ? SKILL_MAX : n) as SkillLevel;
}

/** Builds a complete, Firestore-safe skills object from anything (undefined included). */
export function normalizeSkills(raw: unknown): PlayerSkills {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out = { ...EMPTY_SKILLS };
  SKILL_KEYS.forEach(k => { out[k] = clampLevel(r[k]); });
  return out;
}

/** Which skill's rating is shown — and enforced — for a player standing in each position. */
export const POSITION_SKILL: Record<Position, SkillKey> = {
  def: 'defense',
  mid: 'offense',
  fwd: 'offense',
};

/**
 * Tolerates a name that is on no roster at all (a deleted player still referenced by a
 * locked slot) by reporting it unrated, which never blocks anything.
 */
export function levelOf(players: Player[], name: string | null | undefined, skill: SkillKey): SkillLevel {
  if (!name) return 0;
  const p = players.find(x => x.name === name);
  return p ? normalizeSkills(p.skills)[skill] : 0;
}

/**
 * How many weak players a position line of `size` slots may hold.
 * 1→1, 2→1 (never two C defenders in the default 2/2/2), 3→1, 4→2 …
 */
export function lineWeakCap(size: number): number {
  return Math.max(1, Math.floor(size / 2));
}

/** Weak players currently standing in one of `rot`'s position lines. */
export function lineWeakCount(players: Player[], rot: Rotation, pos: Position): number {
  const skill = POSITION_SKILL[pos];
  return rot[pos].filter(n => levelOf(players, n, skill) === SKILL_LOW).length;
}

/** True when a line holds more weak players than its cap allows — the "WEAK" flag. */
export function isLineOverCap(players: Player[], rot: Rotation, pos: Position): boolean {
  const size = rot[pos].length;
  if (size === 0) return false;
  return lineWeakCount(players, rot, pos) > lineWeakCap(size);
}
