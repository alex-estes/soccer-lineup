import { useEffect, useState } from 'react';
import { useAppState } from '../../state/AppContext';
import { getGame } from '../../lib/utils';
import styles from './SnapDots.module.css';

interface Props {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function SnapDots({ containerRef }: Props) {
  const { state } = useAppState();
  const [activeIndex, setActiveIndex] = useState(0);

  const numRotations = getGame(state.games, state.curGame)?.rotations.length ?? 0;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function updateDots() {
      const cards = container!.querySelectorAll('[data-rotation-card]');
      if (!cards.length) return;
      const containerLeft = container!.getBoundingClientRect().left;
      let closest = 0, minDist = Infinity;
      cards.forEach((card, i) => {
        const dist = Math.abs(card.getBoundingClientRect().left - containerLeft);
        if (dist < minDist) { minDist = dist; closest = i; }
      });
      setActiveIndex(closest);
    }

    container.addEventListener('scroll', updateDots);
    return () => container.removeEventListener('scroll', updateDots);
  }, [containerRef]);

  if (numRotations === 0) return null;

  return (
    <div className={styles.dots}>
      {Array.from({ length: numRotations }, (_, i) => (
        <div key={i} className={styles.hit}>
          <div className={[styles.dot, i === activeIndex ? styles.active : ''].filter(Boolean).join(' ')} />
        </div>
      ))}
    </div>
  );
}
