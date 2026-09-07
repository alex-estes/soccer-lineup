import { IconRefresh, IconBallFootball } from '@tabler/icons-react';
import { useAppState } from '../../state/AppContext';
import { autoGenerate } from '../../lib/autoGenerate';
import { availablePlayersForGame, getGame } from '../../lib/utils';

interface Props {
  onOpenGoals: () => void;
}

export function StickyFooter({ onOpenGoals }: Props) {
  const { state, dispatch } = useAppState();

  function handleGenerate() {
    const game = getGame(state.games, state.curGame);
    if (!game) return;
    if (availablePlayersForGame(state.players, game).length < game.formation.playersOnField) {
      alert(`Need at least ${game.formation.playersOnField} available players.`);
      return;
    }
    const rotations = autoGenerate(state);
    dispatch({ type: 'SET_LINEUP', gameId: state.curGame, rotations });
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
