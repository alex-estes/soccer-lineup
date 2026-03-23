import { useEffect, useRef } from 'react';
import { useAppState } from '../../state/AppContext';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function NewGameModal({ open, onClose }: Props) {
  const { state, dispatch } = useAppState();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else if (inputRef.current) inputRef.current.value = '';
  }, [open]);

  function confirm() {
    const name = inputRef.current?.value.trim() || `Game ${state.games.length + 1}`;
    dispatch({ type: 'ADD_GAME', name });
    onClose();
  }

  if (!open) return null;

  return (
    <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <h3>New Game</h3>
        <div className="modal-body">
          <input
            ref={inputRef}
            className="modal-input"
            placeholder="e.g. vs Eagles"
            maxLength={30}
            onKeyDown={e => { if (e.key === 'Enter') confirm(); }}
          />
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={confirm}>Create</button>
        </div>
      </div>
    </div>
  );
}
