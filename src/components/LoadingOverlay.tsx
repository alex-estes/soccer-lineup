import { useLayoutEffect, useRef } from 'react';
import lottie from 'lottie-web/build/player/lottie_light';
import ballLoader from '../assets/ball-loader.json';
import styles from './LoadingOverlay.module.css';

// Frame shown instead of the loop when the user prefers reduced motion
// (mid-air, ball at full roundness).
const STILL_FRAME = 20;

const FRAME_RATE = ballLoader.fr;
const TOTAL_FRAMES = ballLoader.op - ballLoader.ip;

// Start-up shows the overlay from several places in turn — signing in, then loading
// teams, then loading the team — and each is a fresh mount. Restarting the loop on
// every mount made it replay its first half over and over, so the loop runs on one
// clock shared by every mount, and a mount picks up where the previous one left off.
// A gap longer than this means a new loading session, which starts from frame 0.
const SESSION_GAP_MS = 500;
let clockStart = 0;
let lastUnmount = -Infinity;

function currentFrame(now: number): number {
  if (now - lastUnmount > SESSION_GAP_MS) clockStart = now;
  return (((now - clockStart) / 1000) * FRAME_RATE) % TOTAL_FRAMES;
}

export function LoadingOverlay() {
  const ballRef = useRef<HTMLDivElement>(null);

  // Layout effect, so the ball is drawn before the first paint and a hand-off between
  // two overlays doesn't flash an empty frame.
  useLayoutEffect(() => {
    if (!ballRef.current) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const anim = lottie.loadAnimation({
      container: ballRef.current,
      renderer: 'svg',
      loop: !reduceMotion,
      autoplay: false,
      animationData: ballLoader,
    });
    if (reduceMotion) anim.goToAndStop(STILL_FRAME, true);
    else anim.goToAndPlay(currentFrame(performance.now()), true);
    return () => {
      lastUnmount = performance.now();
      anim.destroy();
    };
  }, []);

  return (
    <div className={styles.overlay} role="status" aria-live="polite">
      <div className={styles.ball} ref={ballRef} aria-hidden="true" />
      <div className={styles.text}>Loading...</div>
    </div>
  );
}
