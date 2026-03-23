import { IconCircleCheck, IconPlayerPlay, IconClock } from '@tabler/icons-react';
import { useAppState } from '../../state/AppContext';

interface Props {
  rIdx: number;
  played: boolean;
  isCurrentRotation: boolean;
}

export function RotationHeader({ rIdx, played, isCurrentRotation }: Props) {
  const { state, dispatch } = useAppState();
  const rots = state.games[state.curGame]?.rotations ?? [];

  const prevPlayed = rIdx === 0 || rots[rIdx - 1]?.played;
  const nextPlayed = rIdx < rots.length - 1 && rots[rIdx + 1]?.played;
  const toggleDisabled = (!played && !prevPlayed) || (played && nextPlayed);

  return (
    <div className="rotation-header">
      <span className="rotation-num">Rotation {rIdx + 1}</span>

      {played ? (
        <span className="played-badge">
          <IconCircleCheck size={11} /> Played
        </span>
      ) : isCurrentRotation ? (
        <span className="current-badge">
          <IconPlayerPlay size={11} /> Current
        </span>
      ) : (
        <span className="upcoming-badge">
          <IconClock size={11} /> Upcoming
        </span>
      )}

      <label
        className={`played-toggle${played ? ' on' : ''}${toggleDisabled ? ' disabled' : ''}`}
        style={{ opacity: toggleDisabled ? 0.35 : 1, cursor: toggleDisabled ? 'not-allowed' : 'pointer' }}
      >
        <input
          type="checkbox"
          checked={played}
          disabled={toggleDisabled}
          onChange={e => dispatch({
            type: 'SET_PLAYED',
            gameIndex: state.curGame,
            rotIndex: rIdx,
            played: e.target.checked,
          })}
        />
        <span className="toggle-label">{played ? 'Played' : 'Mark Played'}</span>
        <div className="toggle-track" />
      </label>
    </div>
  );
}
