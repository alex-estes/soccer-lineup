import { useRef } from 'react';
import { RotationHeader } from './RotationHeader';
import { PositionGroup } from './PositionGroup';
import { BenchRow } from './BenchRow';
import { POSITIONS } from '../../constants';
import { useAppState } from '../../state/AppContext';
import { getGame } from '../../lib/utils';
import type { DragSource } from '../../types';
import styles from './RotationCard.module.css';

interface Props {
  rIdx: number;
}

export function RotationCard({ rIdx }: Props) {
  const { state } = useAppState();
  const game = getGame(state.games, state.curGame);
  const rot = game?.rotations[rIdx];
  // Shared drag state — passed as ref so it doesn't cause re-renders
  const dragRef = useRef<DragSource | null>(null);

  if (!rot || !game) return null;

  const rots = game.rotations;
  const currentRIdx = rots.findIndex(r => !r.played);
  const isCurrentRotation = rIdx === currentRIdx;

  return (
    <div className={[styles.card, rot.played ? styles.played : ''].filter(Boolean).join(' ')} data-rotation-card>
      <RotationHeader rIdx={rIdx} played={rot.played} isCurrentRotation={isCurrentRotation} />
      {POSITIONS.map(pos => (
        <PositionGroup
          key={pos}
          pos={pos}
          rIdx={rIdx}
          rot={rot}
          isPlayed={rot.played}
          dragRef={dragRef}
        />
      ))}
      <BenchRow rIdx={rIdx} isPlayed={rot.played} dragRef={dragRef} />
    </div>
  );
}
