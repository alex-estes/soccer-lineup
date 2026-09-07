import { IconBallFootball, IconShield, IconTrophy, IconX } from '@tabler/icons-react';
import { useAppState } from '../../state/AppContext';
import { getTeamScore } from '../../lib/stats';
import { getGame } from '../../lib/utils';
import { Stepper } from '../Shared/Stepper';
import { Button } from '../Shared/Button';
import { IconButton } from '../Shared/IconButton';
import formStyles from '../Shared/FormModal.module.css';
import styles from './GoalsModal.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function GoalsModal({ open, onClose }: Props) {
  const { state, dispatch } = useAppState();

  const game = getGame(state.games, state.curGame);
  if (!game || !open) return null;

  const gameId = game.id;
  const teamScore = getTeamScore(state, gameId);
  const opponentScore = game.opponentScore || 0;
  const result = teamScore > opponentScore ? 'W' : teamScore < opponentScore ? 'L' : 'T';
  const resultTone = result === 'W' ? 'win' : result === 'L' ? 'loss' : 'tie';
  const resultLabel = result === 'W' ? 'WINNING' : result === 'L' ? 'LOSING' : 'TIED';

  function getGoalCount(name: string): number {
    return state.goals[name]?.[gameId] ?? 0;
  }

  const allPlayed = game.rotations.length > 0 && game.rotations.every(r => r.played);

  return (
    <div className={formStyles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={[formStyles.card, styles.card].join(' ')}>
        <div className={formStyles.header}>
          <div className={formStyles.titleGroup}>
            <IconBallFootball size={24} />
            <span className={formStyles.title}>GOALS — {game.name.toUpperCase()}</span>
          </div>
          <IconButton icon={<IconX size={24} />} onClick={onClose} title="Close" />
        </div>

        <div className={styles.list}>
          {state.players.map(({ name }) => (
            <div className={styles.row} key={name}>
              <span className={styles.name}>{name}</span>
              <Stepper
                value={getGoalCount(name)}
                onChange={v => dispatch({ type: 'SET_GOALS', playerName: name, gameId, count: v })}
              />
            </div>
          ))}
        </div>

        <div className={styles.opponentSection}>
          <div className={styles.row}>
            <span className={styles.opponentLabel}><IconShield size={24} /> {game.name}</span>
            <Stepper
              value={opponentScore}
              onChange={v => dispatch({ type: 'SET_OPPONENT_SCORE', gameId, score: v })}
            />
          </div>
          <div className={[styles.statusBar, styles[resultTone]].join(' ')}>
            {resultLabel} {teamScore}-{opponentScore}
          </div>
        </div>

        <div className={formStyles.footer}>
          <Button variant="secondary" onClick={onClose}>Done</Button>
          {allPlayed && (
            <Button
              variant={game.completed ? 'primary' : 'secondary'}
              onClick={() => dispatch({ type: 'COMPLETE_GAME', gameId })}
            >
              <IconTrophy size={16} />
              {game.completed ? 'Completed' : 'Complete Game'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
