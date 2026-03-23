import { useMemo } from 'react';
import { IconChartBar, IconBallFootball } from '@tabler/icons-react';
import { useAppState } from '../../state/AppContext';
import { getGameStats, getCumulativeStats } from '../../lib/stats';

export function StatsPanel() {
  const { state, dispatch } = useAppState();

  const stats = useMemo(
    () => state.statsScope === 'season' ? getCumulativeStats(state) : getGameStats(state),
    [state.statsScope, state.players, state.goals, state.games, state.curGame]
  );

  const sortedPlayers = useMemo(
    () => [...state.players].map(p => p.name).sort((a, b) => (stats[b]?.total ?? 0) - (stats[a]?.total ?? 0)),
    [stats, state.players]
  );

  return (
    <div className="sidebar-section">
      <h3><IconChartBar size={13} /> Stats</h3>
      <div className="seg-control">
        <button
          className={`seg-btn${state.statsScope === 'game' ? ' active' : ''}`}
          onClick={() => dispatch({ type: 'SET_STATS_SCOPE', scope: 'game' })}
        >
          This Game
        </button>
        <button
          className={`seg-btn${state.statsScope === 'season' ? ' active' : ''}`}
          onClick={() => dispatch({ type: 'SET_STATS_SCOPE', scope: 'season' })}
        >
          Season
        </button>
      </div>
      <div className="stat-header">
        <span>Player</span>
        <span style={{ color: 'var(--def)' }}>D</span>
        <span style={{ color: 'var(--mid)' }}>M</span>
        <span style={{ color: 'var(--fwd)' }}>F</span>
        <span>▶</span>
        <span style={{ color: '#ffb3c6' }}><IconBallFootball size={12} /></span>
      </div>
      <div className="stats-grid">
        {state.players.length === 0 ? (
          <div className="empty-state"><p>Add players to see stats</p></div>
        ) : (
          sortedPlayers.map(name => {
            const s = stats[name];
            const isActive = state.players.find(p => p.name === name)?.active !== false;
            return (
              <div className={`stat-row${isActive ? '' : ' inactive'}`} key={name}>
                <span className="sname">{name}</span>
                <span className="stat-val def">{s?.def ?? 0}</span>
                <span className="stat-val mid">{s?.mid ?? 0}</span>
                <span className="stat-val fwd">{s?.fwd ?? 0}</span>
                <span className="stat-val tot">{s?.total ?? 0}</span>
                <span className="stat-val goals">{(s?.goals ?? 0) > 0 ? s.goals : '—'}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
