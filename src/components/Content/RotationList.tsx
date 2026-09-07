import { useRef } from 'react';
import { RotationCard } from '../RotationCard/RotationCard';
import { SnapDots } from './SnapDots';
import { useAppState } from '../../state/AppContext';
import { getGame } from '../../lib/utils';
import styles from './RotationList.module.css';

export function RotationList() {
  const { state } = useAppState();
  const containerRef = useRef<HTMLDivElement>(null);

  const rotations = getGame(state.games, state.curGame)?.rotations ?? [];

  return (
    <>
      <div className={styles.scroller} ref={containerRef}>
        {rotations.map((_, rIdx) => (
          <RotationCard key={rIdx} rIdx={rIdx} />
        ))}
      </div>
      <SnapDots containerRef={containerRef} />
    </>
  );
}
