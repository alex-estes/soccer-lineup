import { IconUsers } from '@tabler/icons-react';
import { PlayerChip } from './PlayerChip';
import { AddPlayerRow } from './AddPlayerRow';
import { useAppState } from '../../state/AppContext';

export function PlayerList() {
  const { state } = useAppState();

  return (
    <div className="sidebar-section">
      <h3><IconUsers size={13} /> Players</h3>
      <div className="player-list">
        {state.players.length === 0 ? (
          <div className="empty-state">
            <IconUsers size={28} />
            <p><strong>No players yet</strong>Add your first player below</p>
          </div>
        ) : (
          state.players.map((_, i) => (
            <PlayerChip key={i} index={i} />
          ))
        )}
      </div>
      <AddPlayerRow />
    </div>
  );
}
