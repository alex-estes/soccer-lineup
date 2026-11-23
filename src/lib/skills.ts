import { SPORTS } from '../constants';
import type { Player, PlayerSkills, PositionDef, Rotation, SkillKey, SkillLevel, SportId } from '../types';

export const SKILL_MIN = 0;
export const SKILL_MAX = 3;
/** The level the lineup generator treats as "weak". Unrated (0) is deliberately NOT weak. */
export const SKILL_LOW: SkillLevel = 1;
/** Level used for an unrated player when averaging — neutral, i.e. the same as a B. */
export const SKILL_NEUTRAL = 2;

// Same en-dash (U+2013) the stats table uses for an empty cell.
const LETTERS = ['–', 'C', 'B', 'A'] as const;

export function skillLetter(level: number): string {
  return LETTERS[Math.min(SKILL_MAX, Math.max(SKILL_MIN, Math.trunc(level || 0)))];
}

const TIERS = ['Unrated', 'Bronze', 'Silver', 'Gold'] as const;

/** Basketball's name for a level — also the accessible label for its medal. */
export function tierName(level: number): string {
  return TIERS[Math.min(SKILL_MAX, Math.max(SKILL_MIN, Math.trunc(level || 0)))];
}

const TIER_COLORS = ['', 'var(--tier-bronze)', 'var(--tier-silver)', 'var(--tier-gold)'];

/** A basketball level's medal colour (a CSS value); empty for unrated. */
export function tierColor(level: number): string {
  return TIER_COLORS[Math.min(SKILL_MAX, Math.max(SKILL_MIN, Math.trunc(level || 0)))];
}

export function emptySkills(sport: SportId): PlayerSkills {
  const out: PlayerSkills = {};
  SPORTS[sport].skills.forEach(s => { out[s.key] = 0; });
  return out;
}

export function clampLevel(v: unknown): SkillLevel {
  const n = typeof v === 'number' ? Math.trunc(v) : Number(v);
  if (!Number.isFinite(n) || n < SKILL_MIN) return 0;
  return (n > SKILL_MAX ? SKILL_MAX : n) as SkillLevel;
}

/**
 * Builds a complete, Firestore-safe skills object for the sport from anything
 * (undefined included). Keys the sport doesn't use are dropped.
 */
export function normalizeSkills(raw: unknown, sport: SportId): PlayerSkills {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out = emptySkills(sport);
  Object.keys(out).forEach(k => { out[k] = clampLevel(r[k]); });
  return out;
}

/**
 * A player's level at `skill`, falling back to the sport's fallback skill (basketball:
 * Overall) when that one isn't rated. Every reader of ratings — the slot chip, the WEAK
 * flag and the lineup generator — goes through here, so they always agree.
 */
export function playerLevel(player: Player | undefined, skill: SkillKey, sport: SportId): SkillLevel {
  const own = clampLevel(player?.skills?.[skill]);
  if (own) return own;
  const fallback = SPORTS[sport].fallbackSkill;
  return fallback && fallback !== skill ? clampLevel(player?.skills?.[fallback]) : 0;
}

/**
 * Tolerates a name that is on no roster at all (a deleted player still referenced by a
 * locked slot) by reporting it unrated, which never blocks anything.
 */
export function levelOf(
  players: Player[], name: string | null | undefined, skill: SkillKey, sport: SportId,
): SkillLevel {
  if (!name) return 0;
  return playerLevel(players.find(x => x.name === name), skill, sport);
}

/**
 * How many weak players a position line of `size` slots may hold.
 * 1→1, 2→1 (never two C defenders in the default 2/2/2), 3→1, 4→2 …
 */
export function lineWeakCap(size: number): number {
  return Math.max(1, Math.floor(size / 2));
}

/** Weak players currently standing in one of `rot`'s position lines. */
export function lineWeakCount(players: Player[], rot: Rotation, pos: PositionDef, sport: SportId): number {
  return (rot.slots[pos.id] ?? []).filter(n => levelOf(players, n, pos.skill, sport) === SKILL_LOW).length;
}

/** True when a line holds more weak players than its cap allows — the "WEAK" flag. */
export function isLineOverCap(players: Player[], rot: Rotation, pos: PositionDef, sport: SportId): boolean {
  const size = rot.slots[pos.id]?.length ?? 0;
  if (size === 0) return false;
  return lineWeakCount(players, rot, pos, sport) > lineWeakCap(size);
}
