import { useRef } from 'react';
import { IconPlus } from '@tabler/icons-react';
import { useAppState } from '../../state/AppContext';

export function AddPlayerRow() {
  const { state, dispatch } = useAppState();
  const inputRef = useRef<HTMLInputElement>(null);

  function addPlayer() {
    const name = inputRef.current?.value.trim() ?? '';
    if (!name || state.players.some(p => p.name === name)) {
      inputRef.current?.focus();
      return;
    }
    dispatch({ type: 'ADD_PLAYER', name });
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="add-player-row">
      <input
        ref={inputRef}
        type="text"
        placeholder="Add player…"
        maxLength={20}
        onKeyDown={e => { if (e.key === 'Enter') addPlayer(); }}
      />
      <button className="btn-add" onClick={addPlayer}>
        <IconPlus size={16} />
      </button>
    </div>
  );
}
