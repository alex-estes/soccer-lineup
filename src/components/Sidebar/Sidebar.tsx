import { IconLock } from '@tabler/icons-react';
import { PlayerList } from './PlayerList';
import { SeasonRecord } from './SeasonRecord';
import { StatsPanel } from './StatsPanel';

export function Sidebar() {
  return (
    <aside className="sidebar">
      <PlayerList />

      <div className="sidebar-section">
        <h3>
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.65 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Legend
        </h3>
        <div className="legend">
          <div className="legend-item">
            <div className="legend-dot" style={{ background: 'var(--def)' }} />
            Defender
          </div>
          <div className="legend-item">
            <div className="legend-dot" style={{ background: 'var(--mid)' }} />
            Midfielder
          </div>
          <div className="legend-item">
            <div className="legend-dot" style={{ background: 'var(--fwd)' }} />
            Forward
          </div>
          <div className="legend-item">
            <IconLock size={13} style={{ color: 'var(--gray)' }} />
            &nbsp;Locked
          </div>
        </div>
      </div>

      <SeasonRecord />
      <StatsPanel />
    </aside>
  );
}
