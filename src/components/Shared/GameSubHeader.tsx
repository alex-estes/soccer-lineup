import { Link } from 'react-router-dom';
import { IconArrowLeft, IconRotateClockwise2, IconTrophy } from '@tabler/icons-react';
import styles from './GameSubHeader.module.css';

interface Props {
  gameName: string;
  playedCount: number;
  totalRotations: number;
}

export function GameSubHeader({ gameName, playedCount, totalRotations }: Props) {
  const complete = totalRotations > 0 && playedCount === totalRotations;

  return (
    <div className={styles.bar}>
      <div className={styles.left}>
        <Link to="/" className={styles.backLink} aria-label="Back to Home">
          <IconArrowLeft size={24} />
        </Link>
        <span className={styles.name}>VS. {gameName.toUpperCase()}</span>
      </div>
      <div className={styles.right}>
        {complete ? <IconTrophy size={24} /> : <IconRotateClockwise2 size={24} />}
        <span>{complete ? 'COMPLETE' : `${playedCount + 1} OF ${totalRotations}`}</span>
      </div>
    </div>
  );
}
