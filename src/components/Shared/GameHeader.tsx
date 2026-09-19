import { Link } from 'react-router-dom';
import { IconArrowLeft, IconSettings } from '@tabler/icons-react';
import type { LiveResult } from '../../lib/stats';
import styles from './GameHeader.module.css';

interface Props extends LiveResult {
  gameName: string;
  completed: boolean;
  onOpenSettings: () => void;
}

const TONE = { W: 'win', L: 'loss', T: 'tie' } as const;
const LIVE_LABEL = { W: 'WINNING', L: 'LOSING', T: 'TIED' } as const;
const FINAL_LABEL = { W: 'WON', L: 'LOST', T: 'TIED' } as const;

export function GameHeader({ gameName, completed, result, teamScore, opponentScore, onOpenSettings }: Props) {
  const label = (completed ? FINAL_LABEL : LIVE_LABEL)[result];

  return (
    <header className={[styles.header, styles[TONE[result]]].join(' ')}>
      <Link to="/" className={styles.iconButton} aria-label="Back to Home">
        <IconArrowLeft size={24} />
      </Link>
      <div className={styles.center}>
        <span className={styles.name}>VS. {gameName.toUpperCase()}</span>
        <span className={styles.status}>{label} {teamScore}-{opponentScore}</span>
      </div>
      <button type="button" className={styles.iconButton} onClick={onOpenSettings} aria-label="Game Settings">
        <IconSettings size={24} />
      </button>
    </header>
  );
}
