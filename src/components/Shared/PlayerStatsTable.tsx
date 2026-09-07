import { IconRotateClockwise2, IconBallFootball } from '@tabler/icons-react';
import type { Player, StatsMap } from '../../types';
import styles from './PlayerStatsTable.module.css';

interface Props {
  players: Player[];
  stats: StatsMap;
}

function cell(n: number | undefined): string {
  return n && n > 0 ? String(n) : '–';
}

export function PlayerStatsTable({ players, stats }: Props) {
  const sorted = [...players]
    .map(p => p.name)
    .sort((a, b) => (stats[b]?.total ?? 0) - (stats[a]?.total ?? 0));

  if (players.length === 0) {
    return <div className={styles.table}><p className={styles.empty}>Add players to see stats</p></div>;
  }

  return (
    <div className={styles.table}>
      <div className={styles.row}>
        <span className={[styles.player, styles.headerLabel].join(' ')}>PLAYER</span>
        <span className={[styles.val, styles.def].join(' ')}>D</span>
        <span className={[styles.val, styles.mid].join(' ')}>M</span>
        <span className={[styles.val, styles.fwd].join(' ')}>F</span>
        <IconRotateClockwise2 size={18} className={styles.iconHead} />
        <IconBallFootball size={18} className={styles.iconHead} />
      </div>
      {sorted.map(name => {
        const s = stats[name];
        return (
          <div className={styles.row} key={name}>
            <span className={styles.player}>{name}</span>
            <span className={[styles.val, styles.def].join(' ')}>{cell(s?.def)}</span>
            <span className={[styles.val, styles.mid].join(' ')}>{cell(s?.mid)}</span>
            <span className={[styles.val, styles.fwd].join(' ')}>{cell(s?.fwd)}</span>
            <span className={[styles.val, styles.played].join(' ')}>{cell(s?.total)}</span>
            <span className={[styles.val, styles.goals].join(' ')}>{cell(s?.goals)}</span>
          </div>
        );
      })}
    </div>
  );
}
