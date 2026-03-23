import { useRef } from 'react';
import { IconCircleCheck, IconCircleX, IconX } from '@tabler/icons-react';
import { useAppState } from '../../state/AppContext';
import { POSITIONS } from '../../constants';

interface Props {
  index: number;
  number: number;
}

export function PlayerChip({ index, number }: Props) {
  const { state, dispatch } = useAppState();
  const player = state.players[index];
  const inputRef = useRef<HTMLInputElement>(null);

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
      <div className="player-num">{number}</div>
      <input
        ref={inputRef}
        className="player-name-input"
        defaultValue={player.name}
        maxLength={20}
        onBlur={handleRename}
        onKeyDown={e => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
        onClick={e => e.stopPropagation()}
      />
      <button
        className={`active-toggle${player.active ? ' is-active' : ''}`}
        onClick={() => dispatch({ type: 'TOGGLE_ACTIVE', index })}
        title={player.active ? 'Mark inactive' : 'Mark active'}
      >
        {player.active ? <IconCircleCheck size={16} /> : <IconCircleX size={16} />}
      </button>
      <button className="btn-danger" onClick={handleRemove}>
        <IconX size={14} />
      </button>
    </div>
  );
}
