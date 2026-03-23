import { useState } from 'react';
import { IconBallFootball } from '@tabler/icons-react';
import { HeaderMenu } from './HeaderMenu';
import { useAppState } from '../../state/AppContext';
import type { SyncStatus } from '../../types';

interface Props {
  syncStatus: SyncStatus;
}

export function Header({ syncStatus }: Props) {
  const { state, dispatch } = useAppState();
  const [menuOpen, setMenuOpen] = useState(false);

  const game = state.games[state.curGame];
  const rots = game?.rotations ?? [];
  const playedCount = rots.filter(r => r.played).length;
  const rotLabel = playedCount === rots.length
    ? 'Game Complete'
    : `Rotation ${playedCount + 1} of ${rots.length}`;

  const syncLabel =
    syncStatus === 'saving' ? '↑ Saving…' :
    syncStatus === 'saved' ? '✓ Synced' :
    syncStatus === 'error' ? '⚠ Offline' : '';
  const syncColor =
    syncStatus === 'saving' ? 'rgba(255,255,255,0.4)' :
    syncStatus === 'saved' ? 'rgba(168,155,249,0.7)' :
    syncStatus === 'error' ? '#f97b8b' : 'rgba(255,255,255,0.3)';

  function handleClear() {
    if (!confirm('Clear all rotations in this game? Locks and played status will be reset.')) return;
    dispatch({ type: 'CLEAR_GAME', gameIndex: state.curGame });
  }

  return (
    <header>
      <div className="header-brand">
        <IconBallFootball size={16} />
        <h1>Eagles Soccer</h1>
      </div>
      <div className="header-main-row">
        <div className="header-left">
          <span className="header-game-name">{game?.name}</span>
          {rots.length > 0 && (
            <span className="header-rotation-label">{rotLabel}</span>
          )}
          {syncLabel && (
            <span style={{
              fontFamily: "'Inter', sans-serif", fontSize: '0.62rem', fontWeight: 600,
              letterSpacing: '0.06em', color: syncColor, textTransform: 'uppercase',
            }}>
              {syncLabel}
            </span>
          )}
        </div>
        <HeaderMenu
          open={menuOpen}
          onToggle={() => setMenuOpen(v => !v)}
          onClose={() => setMenuOpen(false)}
          onClear={handleClear}
        />
      </div>
    </header>
  );
}
