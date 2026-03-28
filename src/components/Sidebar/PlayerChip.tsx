import { useEffect, useRef, useState } from 'react';
import { IconUser, IconUserOff, IconDots, IconTrash } from '@tabler/icons-react';
import { useAppState } from '../../state/AppContext';
import { POSITIONS } from '../../constants';

interface Props {
  index: number;
}

export function PlayerChip({ index }: Props) {
  const { state, dispatch } = useAppState();
  const player = state.players[index];
  const inputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  if (!player) return null;

  function handleRemove() {
    const name = player.name;
    const hasHistory = state.games.some(g =>
      g.completed && g.rotations.some(r =>
        POSITIONS.some(pos => r[pos].includes(name))
      )
    );
    if (hasHistory) {
      if (!confirm(`${name} has played in completed games. Their stats will be removed. Delete anyway?`)) return;
    }
    dispatch({ type: 'REMOVE_PLAYER', index });
  }

  function handleRename() {
    const newName = inputRef.current?.value.trim() ?? '';
    if (newName && newName !== player.name) {
      dispatch({ type: 'RENAME_PLAYER', index, newName });
    }
  }

  return (
    <div className={`player-chip${player.active ? '' : ' inactive'}`}>
      <button
        className={`active-toggle${player.active ? ' is-active' : ''}`}
        onClick={() => dispatch({ type: 'TOGGLE_ACTIVE', index })}
        title={player.active ? 'Mark inactive' : 'Mark active'}
      >
        {player.active ? <IconUser size={16} /> : <IconUserOff size={16} />}
      </button>
      <input
        ref={inputRef}
        className="player-name-input"
        defaultValue={player.name}
        maxLength={20}
        onBlur={handleRename}
        onKeyDown={e => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
        onClick={e => e.stopPropagation()}
      />
      <div className="player-chip-menu" ref={menuRef}>
        <button
          className="player-chip-dots"
          onClick={e => { e.stopPropagation(); setMenuOpen(o => !o); }}
          title="More options"
        >
          <IconDots size={16} />
        </button>
        {menuOpen && (
          <div className="header-dropdown open">
            <button
              className="header-dropdown-signout"
              onClick={() => { setMenuOpen(false); handleRemove(); }}
            >
              <IconTrash size={16} /> Delete Player
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
