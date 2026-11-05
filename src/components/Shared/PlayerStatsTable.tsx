import { IconRotateClockwise2 } from '@tabler/icons-react';
import { positionAbbrevs, positionColor } from '../../constants';
import { statCell } from '../../lib/stats';
import { SportIcon } from './SportIcon';
import type { Player, PositionDef, SportId, StatsMap } from '../../types';
import styles from './PlayerStatsTable.module.css';

interface Props {
  players: Player[];
  stats: StatsMap;
  /** One column per position, in this order (see statsColumns). */
  positions: PositionDef[];
  sport: SportId;
  /** Names to render in the dimmed/disabled style — e.g. players excluded from this specific game. */
  dimNames?: Set<string>;
  /** Skip the outer card chrome (bg/border/padding) — for nesting inside another card. */
  bare?: boolean;
}

export function PlayerStatsTable({ players, stats, positions, sport, dimNames, bare }: Props) {
  const sorted = [...players]
    .map(p => p.name)
    .sort((a, b) => (stats[b]?.total ?? 0) - (stats[a]?.total ?? 0));

  const wrapClass = bare ? styles.bare : styles.table;
  const abbrevs = positionAbbrevs(positions);

  if (players.length === 0) {
    return <div className={wrapClass}><p className={styles.empty}>Add players to see stats</p></div>;
  }

  return (
    <div className={wrapClass}>
      <div className={styles.row}>
        <span className={[styles.player, styles.headerLabel].join(' ')}>PLAYER</span>
        {positions.map((p, i) => (
          <span key={p.id} className={styles.val} style={{ color: positionColor(i) }} title={p.name}>
            {abbrevs[p.id]}
          </span>
        ))}
        <IconRotateClockwise2 size={18} className={styles.iconHead} />
        <SportIcon sport={sport} size={18} className={styles.iconHead} />
      </div>
      {sorted.map(name => {
        const s = stats[name];
        const dim = dimNames?.has(name);
        return (
          <div className={[styles.row, dim ? styles.dim : ''].filter(Boolean).join(' ')} key={name}>
            <span className={styles.player}>{name}</span>
            {positions.map((p, i) => (
              <span key={p.id} className={styles.val} style={{ color: positionColor(i) }}>
                {statCell(s?.byPos[p.id])}
              </span>
            ))}
            <span className={[styles.val, styles.played].join(' ')}>{statCell(s?.total)}</span>
            <span className={[styles.val, styles.goals].join(' ')}>{statCell(s?.score)}</span>
          </div>
        );
      })}
    </div>
  );
}
