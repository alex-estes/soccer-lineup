import { IconRefresh, IconBallFootball } from '@tabler/icons-react';
import { useAppState } from '../../state/AppContext';
import { autoGenerate } from '../../lib/autoGenerate';
import { activePlayers } from '../../lib/utils';
import { FIELD_SIZE } from '../../constants';

interface Props {
  onOpenGoals: () => void;
}

export function StickyFooter({ onOpenGoals }: Props) {
  const { state, dispatch } = useAppState();

  function handleGenerate() {
    if (activePlayers(state.players).length < FIELD_SIZE) {
      alert('Need at least 6 active players.');
      return;
    }
    const rotations = autoGenerate(state);
    dispatch({ type: 'SET_LINEUP', gameIndex: state.curGame, rotations });
  }

  return (
    <div className="sticky-footer">
      <button className="btn btn-primary" onClick={handleGenerate}>
        <IconRefresh size={16} /> Generate Lineup
      </button>
      <button className="btn btn-secondary" onClick={onOpenGoals}>
        <IconBallFootball size={16} /> Goals
      </button>
    </div>
  );
}
