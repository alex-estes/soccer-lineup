import { Link } from 'react-router-dom';
import { IconArrowLeft, IconRotateClockwise2, IconSettings, IconTrophy } from '@tabler/icons-react';
import styles from './GameHeader.module.css';

interface Props {
  gameName: string;
  playedCount: number;
  totalRotations: number;
  onOpenSettings: () => void;
}

export function GameHeader({ gameName, playedCount, totalRotations, onOpenSettings }: Props) {
  const complete = totalRotations > 0 && playedCount === totalRotations;

  return (
    <header className={styles.header}>
      <Link to="/" className={styles.iconButton} aria-label="Back to Home">
        <IconArrowLeft size={24} />
      </Link>
      <div className={styles.center}>
        <span className={styles.name}>VS. {gameName.toUpperCase()}</span>
        <span className={styles.status}>
          {complete ? <IconTrophy size={16} /> : <IconRotateClockwise2 size={16} />}
          {complete ? 'COMPLETE' : `${playedCount + 1} OF ${totalRotations}`}
        </span>
      </div>
      <button type="button" className={styles.iconButton} onClick={onOpenSettings} aria-label="Game Settings">
        <IconSettings size={24} />
      </button>
    </header>
  );
}
