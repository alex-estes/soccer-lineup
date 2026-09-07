import type { ReactNode } from 'react';
import styles from './Chip.module.css';

interface Props {
  tone: 'win' | 'loss' | 'tie' | 'neutral';
  children: ReactNode;
}

export function Chip({ tone, children }: Props) {
  return <span className={[styles.chip, styles[tone]].join(' ')}>{children}</span>;
}
