import styles from './StatTile.module.css';

type Tone = 'win' | 'loss' | 'tie' | 'teal' | 'neutral' | 'def' | 'mid' | 'fwd';

interface Props {
  value: number | string;
  label: string;
  tone: Tone;
}

export function StatTile({ value, label, tone }: Props) {
  return (
    <div className={[styles.tile, styles[tone]].join(' ')}>
      <p className={styles.value}>{value}</p>
      <p className={styles.label}>{label}</p>
    </div>
  );
}
