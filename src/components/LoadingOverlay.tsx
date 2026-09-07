import { IconBallFootball } from '@tabler/icons-react';
import styles from './LoadingOverlay.module.css';

export function LoadingOverlay() {
  return (
    <div className={styles.overlay}>
      <div className={styles.ball}>
        <IconBallFootball size={40} />
      </div>
      <div className={styles.text}>Loading...</div>
    </div>
  );
}
