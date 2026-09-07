import styles from './StatTile.module.css';

interface Props {
  value: number;
  label: string;
  tone: 'win' | 'loss' | 'tie';
}

export function StatTile({ value, label, tone }: Props) {
  return (
    <div className={[styles.tile, styles[tone]].join(' ')}>
      <p className={styles.value}>{value}</p>
      <p className={styles.label}>{label}</p>
    </div>
  );
}
