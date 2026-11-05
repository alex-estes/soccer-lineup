import { RotationHeader } from './RotationHeader';
import { PositionGroup } from './PositionGroup';
import { BenchRow } from './BenchRow';
import { useAppState } from '../../state/AppContext';
import { getGame } from '../../lib/utils';
import { positionColor } from '../../constants';
import styles from './RotationCard.module.css';

interface Props {
  rIdx: number;
}

export function RotationCard({ rIdx }: Props) {
  const { state } = useAppState();
  const game = getGame(state.games, state.curGame);
  const rot = game?.rotations[rIdx];

  if (!rot || !game) return null;

  const rots = game.rotations;
  const currentRIdx = rots.findIndex(r => !r.played);
  const isCurrentRotation = rIdx === currentRIdx;

  return (
    <div className={[styles.card, rot.played ? styles.played : ''].filter(Boolean).join(' ')} data-rotation-card>
      <RotationHeader rIdx={rIdx} played={rot.played} isCurrentRotation={isCurrentRotation} />
      {game.positions.map((pos, i) => (
        <PositionGroup
          key={pos.id}
          pos={pos}
          color={positionColor(i)}
          rIdx={rIdx}
          rot={rot}
          isPlayed={rot.played}
        />
      ))}
      <BenchRow rIdx={rIdx} isPlayed={rot.played} />
    </div>
  );
}
