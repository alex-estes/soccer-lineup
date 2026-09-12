import type { ReactNode } from 'react';
import styles from './Chip.module.css';

interface Props {
  tone: 'win' | 'loss' | 'tie' | 'neutral' | 'warning';
  /** `sm` is the compact form used inline next to a player's name. */
  size?: 'md' | 'sm';
  children: ReactNode;
}

export function Chip({ tone, size = 'md', children }: Props) {
  // No `.md` class exists, so index explicitly rather than via styles[size].
  const sizeClass = size === 'sm' ? styles.sm : '';
  return (
    <span className={[styles.chip, styles[tone], sizeClass].filter(Boolean).join(' ')}>
      {children}
    </span>
  );
}
