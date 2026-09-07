import { IconRotateClockwise2, IconBallFootball } from '@tabler/icons-react';
import type { Player, StatsMap } from '../../types';
import styles from './PlayerStatsTable.module.css';

interface Props {
  players: Player[];
  stats: StatsMap;
  /** Names to render in the dimmed/disabled style — e.g. players excluded from this specific game. */
  dimNames?: Set<string>;
  /** Skip the outer card chrome (bg/border/padding) — for nesting inside another card. */
  bare?: boolean;
}

function cell(n: number | undefined): string {
  return n && n > 0 ? String(n) : '–';
}

export function PlayerStatsTable({ players, stats, dimNames, bare }: Props) {
  const sorted = [...players]
    .map(p => p.name)
    .sort((a, b) => (stats[b]?.total ?? 0) - (stats[a]?.total ?? 0));

  const wrapClass = bare ? styles.bare : styles.table;

  if (players.length === 0) {
    return <div className={wrapClass}><p className={styles.empty}>Add players to see stats</p></div>;
  }

  return (
    <div className={wrapClass}>
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
        const dim = dimNames?.has(name);
        return (
          <div className={[styles.row, dim ? styles.dim : ''].filter(Boolean).join(' ')} key={name}>
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
