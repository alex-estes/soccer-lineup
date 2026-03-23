import { useRef } from 'react';
import { RotationHeader } from './RotationHeader';
import { PositionGroup } from './PositionGroup';
import { BenchRow } from './BenchRow';
import { POSITIONS } from '../../constants';
import { useAppState } from '../../state/AppContext';
import type { DragSource } from '../../types';

interface Props {
  rIdx: number;
}

export function RotationCard({ rIdx }: Props) {
  const { state } = useAppState();
  const rot = state.games[state.curGame]?.rotations[rIdx];
  // Shared drag state — passed as ref so it doesn't cause re-renders
  const dragRef = useRef<DragSource | null>(null);

  if (!rot) return null;

  const rots = state.games[state.curGame].rotations;
  const currentRIdx = rots.findIndex(r => !r.played);
  const isCurrentRotation = rIdx === currentRIdx;

  return (
    <div className={`rotation-card${rot.played ? ' is-played' : ''}`}>
      <RotationHeader rIdx={rIdx} played={rot.played} isCurrentRotation={isCurrentRotation} />
      <div className="rotation-field">
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
      </div>
      <BenchRow rIdx={rIdx} isPlayed={rot.played} dragRef={dragRef} />
    </div>
  );
}
