import styles from './StatTile.module.css';

type Tone = 'win' | 'loss' | 'tie' | 'teal' | 'neutral' | 'position';

interface Props {
  value: number | string;
  label: string;
  tone: Tone;
  /** Value colour for the `position` tone. */
  color?: string;
}

export function StatTile({ value, label, tone, color }: Props) {
  return (
    <div className={[styles.tile, styles[tone]].join(' ')}>
      <p className={styles.value} style={color ? { color } : undefined}>{value}</p>
      <p className={styles.label}>{label}</p>
    </div>
  );
}
