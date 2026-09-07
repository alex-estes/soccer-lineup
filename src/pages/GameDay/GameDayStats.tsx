import { useMemo } from 'react';
import { IconChartBar } from '@tabler/icons-react';
import { useAppState } from '../../state/AppContext';
import { getGameStats, getCumulativeStats } from '../../lib/stats';
import { SegmentedControl } from '../../components/Shared/SegmentedControl';
import { PlayerStatsTable } from '../../components/Shared/PlayerStatsTable';
import type { Game } from '../../types';
import styles from './GameDayStats.module.css';

interface Props {
  game: Game;
}

export function GameDayStats({ game }: Props) {
  const { state, dispatch } = useAppState();

  const stats = useMemo(
    () => state.statsScope === 'season' ? getCumulativeStats(state) : getGameStats(state),
    [state]
  );

  const dimNames = useMemo(() => new Set(game.excludedPlayers), [game.excludedPlayers]);

  return (
    <section className={styles.section}>
      <div className={styles.heading}>
        <IconChartBar size={24} />
        <span>STATS</span>
      </div>
      <div className={styles.card}>
        <SegmentedControl
          value={state.statsScope}
          onChange={scope => dispatch({ type: 'SET_STATS_SCOPE', scope })}
          options={[
            { value: 'game', label: 'This Game' },
            { value: 'season', label: 'Season' },
          ]}
        />
        <PlayerStatsTable players={state.players} stats={stats} dimNames={dimNames} bare />
      </div>
    </section>
  );
}
