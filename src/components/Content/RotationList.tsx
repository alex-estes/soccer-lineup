import { useRef } from 'react';
import { RotationCard } from '../RotationCard/RotationCard';
import { SnapDots } from './SnapDots';
import { useAppState } from '../../state/AppContext';

export function RotationList() {
  const { state } = useAppState();
  const containerRef = useRef<HTMLDivElement>(null);

  const rotations = state.games[state.curGame]?.rotations ?? [];

  return (
    <>
      <div className="rotations" ref={containerRef}>
        {rotations.map((_, rIdx) => (
          <RotationCard key={rIdx} rIdx={rIdx} />
        ))}
      </div>
      <SnapDots containerRef={containerRef} />
    </>
  );
}
