import { IconBallFootball, IconMinus, IconPlus, IconShield, IconTrophy } from '@tabler/icons-react';
import { useAppState } from '../../state/AppContext';
import { getTeamScore } from '../../lib/stats';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function GoalsModal({ open, onClose }: Props) {
  const { state, dispatch } = useAppState();

  const game = state.games[state.curGame];
  if (!game || !open) return null;

  const gIdx = state.curGame;
  const teamScore = getTeamScore(state, gIdx);
  const opponentScore = game.opponentScore || 0;

  function getGoalCount(name: string): number {
    return state.goals[name]?.[gIdx] ?? 0;
  }

  function adjGoal(name: string, delta: number) {
    const current = getGoalCount(name);
    dispatch({ type: 'SET_GOALS', playerName: name, gameIndex: gIdx, count: current + delta });
  }

  function adjOpponent(delta: number) {
    dispatch({ type: 'SET_OPPONENT_SCORE', gameIndex: gIdx, score: opponentScore + delta });
  }

  const allPlayed = game.rotations.every(r => r.played);

  let scoreSummaryLabel = '';
  let scoreSummaryClass = 'score-summary';
  if (teamScore > opponentScore) {
    scoreSummaryLabel = `Eagles ${teamScore} – ${opponentScore}  ·  Winning`;
    scoreSummaryClass += ' win';
  } else if (teamScore < opponentScore) {
    scoreSummaryLabel = `Eagles ${teamScore} – ${opponentScore}  ·  Losing`;
    scoreSummaryClass += ' loss';
  } else {
    scoreSummaryLabel = `Eagles ${teamScore} – ${opponentScore}  ·  Tied`;
    scoreSummaryClass += ' tie';
  }

  return (
    <div
      id="goalsModal"
      className="modal-overlay open"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal">
        <h3>
          <IconBallFootball size={16} /> Goals —{' '}
          <span style={{ color: 'var(--white)', fontSize: '0.9em', fontWeight: 600 }}>
            {game.name}
          </span>
        </h3>
        <div className="modal-body">
          <div className="goals-list">
            {state.players.map(({ name }) => (
              <div className="goal-row" key={name}>
                <span className="gname">{name}</span>
                <div className="goal-stepper">
                  <button onClick={() => adjGoal(name, -1)}><IconMinus size={16} /></button>
                  <span className="goal-count">{getGoalCount(name)}</span>
                  <button onClick={() => adjGoal(name, 1)}><IconPlus size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="opponent-score-section">
          <div className="opponent-score-row">
            <span className="opponent-label">
              <IconShield size={16} /> Opponent Score
            </span>
            <div className="goal-stepper">
              <button onClick={() => adjOpponent(-1)}><IconMinus size={16} /></button>
              <span className="goal-count">{opponentScore}</span>
              <button onClick={() => adjOpponent(1)}><IconPlus size={16} /></button>
            </div>
          </div>
          <div className={scoreSummaryClass}>{scoreSummaryLabel}</div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>Done</button>
          {allPlayed && (
            <button
              className={`btn ${game.completed ? 'btn-secondary' : 'btn-primary'}`}
              onClick={() => dispatch({ type: 'COMPLETE_GAME', gameIndex: gIdx })}
            >
              <IconTrophy size={16} />
              {game.completed ? ' Completed' : ' Complete Game'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
