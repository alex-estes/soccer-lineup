import { IconTrophy } from '@tabler/icons-react';
import { SportIcon } from '../Shared/SportIcon';
import { SPORTS } from '../../constants';
import { useAppState } from '../../state/AppContext';
import { getGame } from '../../lib/utils';
import { Button } from '../Shared/Button';
import styles from './StickyFooter.module.css';

interface Props {
  onOpenGoals: () => void;
}

export function StickyFooter({ onOpenGoals }: Props) {
  const { state, dispatch } = useAppState();
  const game = getGame(state.games, state.curGame);
  if (!game) return null;

  const allPlayed = game.rotations.length > 0 && game.rotations.every(r => r.played);

  return (
    <div className={styles.footer}>
      {allPlayed && (
        <Button
          variant={game.completed ? 'primary' : 'secondary'}
          onClick={() => dispatch({ type: 'COMPLETE_GAME', gameId: game.id })}
        >
          <IconTrophy size={24} />
          {game.completed ? 'Completed' : 'Game Complete'}
        </Button>
      )}
      <Button variant="primary" onClick={onOpenGoals}>
        <SportIcon sport={state.team.sport} />
        {SPORTS[state.team.sport].scoreLabel}
      </Button>
    </div>
  );
}
