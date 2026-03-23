import { useEffect, useState } from 'react';
import { useAppState } from '../../state/AppContext';

interface Props {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function SnapDots({ containerRef }: Props) {
  const { state } = useAppState();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 700);

  const numRotations = state.games[state.curGame]?.rotations.length ?? 0;

  useEffect(() => {
    function checkMobile() { setIsMobile(window.innerWidth <= 700); }
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isMobile) return;

    function updateDots() {
      const cards = container!.querySelectorAll('.rotation-card');
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
  }, [containerRef, isMobile]);

  if (!isMobile || numRotations === 0) return null;

  return (
    <div className="snap-dots">
      {Array.from({ length: numRotations }, (_, i) => (
        <div key={i} className={`snap-dot${i === activeIndex ? ' active' : ''}`} />
      ))}
    </div>
  );
}
