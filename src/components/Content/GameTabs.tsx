import { useRef, useState } from 'react';
import { IconPencil, IconTrash } from '@tabler/icons-react';
import { useAppState } from '../../state/AppContext';

interface Props {
  onNewGame: () => void;
}

export function GameTabs({ onNewGame }: Props) {
  const { state, dispatch } = useAppState();
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function startEditing(i: number) {
    setEditingIdx(i);
    setEditValue(state.games[i].name);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function commitEdit() {
    if (editingIdx !== null) {
      dispatch({ type: 'RENAME_GAME', gameIndex: editingIdx, name: editValue });
    }
    setEditingIdx(null);
  }

  function cancelEdit() {
    setEditingIdx(null);
  }

  function handleDelete(i: number) {
    if (!confirm(`Delete "${state.games[i].name}"? This cannot be undone.`)) return;
    dispatch({ type: 'DELETE_GAME', gameIndex: i });
  }

  return (
    <div className="game-tabs">
      {state.games.map((g, i) => {
        const isActive = i === state.curGame;
        const isEditing = editingIdx === i;

        return (
          <div
            key={i}
            className={`game-tab${isActive ? ' active' : ''}`}
            onClick={() => { if (!isActive) dispatch({ type: 'SET_CUR_GAME', index: i }); }}
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
                  onClick={() => startEditing(i)}
                >
                  <IconPencil size={11} />
                </button>
                {state.games.length > 1 && (
                  <button
                    className="game-tab-icon-btn game-tab-icon-btn--danger"
                    title="Delete game"
                    onClick={() => handleDelete(i)}
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
