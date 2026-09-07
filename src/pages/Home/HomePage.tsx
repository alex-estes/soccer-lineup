import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { User } from 'firebase/auth';
import { Header } from '../../components/Header/Header';
import { Sidebar } from '../../components/Sidebar/Sidebar';
import { NewGameModal } from '../../components/Modals/NewGameModal';
import { useAppState } from '../../state/AppContext';
import type { SyncStatus } from '../../types';

interface Props {
  syncStatus: SyncStatus;
  user: User;
  onSignOut: () => void;
}

// Phase 2 routing skeleton — functional, not yet styled to the Figma Home
// design (stat tiles, game cards, player-stats table, roster cards land
// in a later pass).
export function HomePage({ syncStatus, user, onSignOut }: Props) {
  const { state, dispatch } = useAppState();
  const [newGameOpen, setNewGameOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && newGameOpen) setNewGameOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [newGameOpen]);

  function handleRename(gameId: string, currentName: string) {
    const name = prompt('Rename game', currentName);
    if (name && name.trim()) dispatch({ type: 'RENAME_GAME', gameId, name });
  }

  function handleDelete(gameId: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    dispatch({ type: 'DELETE_GAME', gameId });
  }

  return (
    <>
      <Header syncStatus={syncStatus} user={user} onSignOut={onSignOut} />
      <div className={`main${state.isLoaded ? ' fade-in' : ''}`}>
        <Sidebar />
        <main className="content">
          <div className="content-header">
            <h2>Games</h2>
            <button className="btn-new-game" onClick={() => setNewGameOpen(true)}>+ New Game</button>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {state.games.map(g => (
              <li key={g.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0' }}>
                <Link to={`/game/${g.id}`}>{g.name}</Link>
                <button onClick={() => handleRename(g.id, g.name)}>Rename</button>
                {state.games.length > 1 && (
                  <button onClick={() => handleDelete(g.id, g.name)}>Delete</button>
                )}
              </li>
            ))}
          </ul>
        </main>
      </div>
      <NewGameModal open={newGameOpen} onClose={() => setNewGameOpen(false)} />
    </>
  );
}
