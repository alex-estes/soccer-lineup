import { IconAwardFilled } from '@tabler/icons-react';
import type { RatingStyle } from '../../constants';
import { clampLevel, skillLetter, tierName } from '../../lib/skills';
import styles from './SkillRating.module.css';

const TIER_COLORS = ['', 'var(--tier-bronze)', 'var(--tier-silver)', 'var(--tier-gold)'];

interface Props {
  level: number;
  ratingStyle: RatingStyle;
  /** Medal size in px; letters follow the surrounding text. */
  size?: number;
}

/** One rating level, drawn the way the team's sport draws it: C/B/A or a coloured medal. */
export function SkillRating({ level, ratingStyle, size = 24 }: Props) {
  const l = clampLevel(level);
  if (ratingStyle === 'letter' || l === 0) {
    return <span aria-label={ratingStyle === 'medal' ? tierName(l) : undefined}>{skillLetter(l)}</span>;
  }
  return (
    <span className={styles.medal} role="img" aria-label={tierName(l)} title={tierName(l)}>
      <IconAwardFilled size={size} style={{ color: TIER_COLORS[l] }} aria-hidden />
    </span>
  );
}
