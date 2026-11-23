import { IconPercentage0, IconPercentage33, IconPercentage66, IconPercentage100 } from '@tabler/icons-react';
import type { RatingStyle } from '../../constants';
import { clampLevel, skillLetter, tierColor, tierName } from '../../lib/skills';
import styles from './SkillRating.module.css';

// Unrated, C, B, A.
const PERCENT_ICONS = [IconPercentage0, IconPercentage33, IconPercentage66, IconPercentage100];

interface Props {
  level: number;
  ratingStyle: RatingStyle;
  /** Icon size in px; letters follow the surrounding text. */
  size?: number;
}

/** One rating level, drawn the way the team's sport draws it: C/B/A or a coloured percentage icon. */
export function SkillRating({ level, ratingStyle, size = 24 }: Props) {
  const l = clampLevel(level);
  if (ratingStyle === 'letter') return <span>{skillLetter(l)}</span>;
  const Icon = PERCENT_ICONS[l];
  return (
    <span className={styles.icon} role="img" aria-label={tierName(l)} title={tierName(l)}>
      <Icon size={size} style={{ color: tierColor(l) }} aria-hidden />
    </span>
  );
}
