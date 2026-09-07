import { useRef, useState } from 'react';
import { IconPencil, IconTrash } from '@tabler/icons-react';
import { useAppState } from '../../state/AppContext';

interface Props {
  onNewGame: () => void;
}

export function GameTabs({ onNewGame }: Props) {
  const { state, dispatch } = useAppState();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function startEditing(id: string, currentName: string) {
    setEditingId(id);
    setEditValue(currentName);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function commitEdit() {
    if (editingId !== null) {
      dispatch({ type: 'RENAME_GAME', gameId: editingId, name: editValue });
    }
    setEditingId(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    dispatch({ type: 'DELETE_GAME', gameId: id });
  }

  return (
    <div className="game-tabs">
      {state.games.map(g => {
        const isActive = g.id === state.curGame;
        const isEditing = editingId === g.id;

        return (
          <div
            key={g.id}
            className={`game-tab${isActive ? ' active' : ''}`}
            onClick={() => { if (!isActive) dispatch({ type: 'SET_CUR_GAME', id: g.id }); }}
          >
            {isEditing ? (
              <input
                ref={inputRef}
                className="game-tab-input"
                value={editValue}
                maxLength={30}
                onChange={e => setEditValue(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
                  if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
                }}
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <span className="game-tab-name">{g.name}</span>
            )}
            {isActive && !isEditing && (
              <span className="game-tab-actions" onClick={e => e.stopPropagation()}>
                <button
                  className="game-tab-icon-btn"
                  title="Rename game"
                  onClick={() => startEditing(g.id, g.name)}
                >
                  <IconPencil size={11} />
                </button>
                {state.games.length > 1 && (
                  <button
                    className="game-tab-icon-btn game-tab-icon-btn--danger"
                    title="Delete game"
                    onClick={() => handleDelete(g.id, g.name)}
                  >
                    <IconTrash size={11} />
                  </button>
                )}
              </span>
            )}
          </div>
        );
      })}
      <button className="btn-new-game" onClick={onNewGame}>
        + New Game
      </button>
    </div>
  );
}
