import { useEffect, useRef } from 'react';
import lottie from 'lottie-web/build/player/lottie_light';
import ballLoader from '../assets/ball-loader.json';
import styles from './LoadingOverlay.module.css';

// Frame shown instead of the loop when the user prefers reduced motion
// (mid-air, ball at full roundness).
const STILL_FRAME = 20;

export function LoadingOverlay() {
  const ballRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ballRef.current) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const anim = lottie.loadAnimation({
      container: ballRef.current,
      renderer: 'svg',
      loop: !reduceMotion,
      autoplay: !reduceMotion,
      animationData: ballLoader,
    });
    if (reduceMotion) anim.goToAndStop(STILL_FRAME, true);
    return () => anim.destroy();
  }, []);

  return (
    <div className={styles.overlay} role="status" aria-live="polite">
      <div className={styles.ball} ref={ballRef} aria-hidden="true" />
      <div className={styles.text}>Loading...</div>
    </div>
  );
}
