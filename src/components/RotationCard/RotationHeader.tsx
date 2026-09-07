import { IconSquare, IconSquareCheckFilled } from '@tabler/icons-react';
import { useAppState } from '../../state/AppContext';
import { getGame } from '../../lib/utils';
import { Chip } from '../Shared/Chip';
import styles from './RotationHeader.module.css';

interface Props {
  rIdx: number;
  played: boolean;
  isCurrentRotation: boolean;
}

export function RotationHeader({ rIdx, played, isCurrentRotation }: Props) {
  const { state, dispatch } = useAppState();
  const rots = getGame(state.games, state.curGame)?.rotations ?? [];

  const prevPlayed = rIdx === 0 || rots[rIdx - 1]?.played;
  const nextPlayed = rIdx < rots.length - 1 && rots[rIdx + 1]?.played;
  const toggleDisabled = (!played && !prevPlayed) || (played && nextPlayed);

  return (
    <div className={styles.row}>
      <div className={styles.titleGroup}>
        <span className={styles.title}>Rotation {rIdx + 1}</span>
        <Chip tone="neutral">
          {played ? 'PLAYED' : isCurrentRotation ? 'CURRENT' : 'UPCOMING'}
        </Chip>
      </div>

      <button
        type="button"
        className={styles.markPlayed}
        disabled={toggleDisabled}
        onClick={() => dispatch({
          type: 'SET_PLAYED',
          gameId: state.curGame,
          rotIndex: rIdx,
          played: !played,
        })}
      >
        <span className={[styles.markPlayedLabel, played ? styles.on : ''].filter(Boolean).join(' ')}>
          {played ? 'PLAYED' : 'MARK PLAYED'}
        </span>
        <span className={[styles.markPlayedIcon, played ? styles.on : ''].filter(Boolean).join(' ')}>
          {played ? <IconSquareCheckFilled size={24} /> : <IconSquare size={24} />}
        </span>
      </button>
    </div>
  );
}
