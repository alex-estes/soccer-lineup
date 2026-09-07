import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IconFlag, IconDots, IconChevronRight, IconPencil, IconTrash } from '@tabler/icons-react';
import { Chip } from './Chip';
import { IconButton } from './IconButton';
import { DropdownMenu } from './DropdownMenu';
import type { Game } from '../../types';
import styles from './GameCard.module.css';

interface Props {
  game: Game;
  result: 'W' | 'L' | 'T' | null;
  teamScore: number;
  onRename: () => void;
  onDelete: () => void;
}

export function GameCard({ game, result, teamScore, onRename, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={styles.card}>
      <Link to={`/game/${game.id}`} className={styles.link}>
        <IconFlag size={24} className={styles.icon} />
        <span className={styles.name}>{game.name}</span>
        {result && (
          <Chip tone={result === 'W' ? 'win' : result === 'L' ? 'loss' : 'tie'}>
            {result} {teamScore}-{game.opponentScore}
          </Chip>
        )}
      </Link>
      <div className={styles.menuWrap}>
        <IconButton icon={<IconDots size={24} />} onClick={() => setMenuOpen(o => !o)} title="Game options" />
        {menuOpen && (
          <DropdownMenu
            onClose={() => setMenuOpen(false)}
            items={[
              { label: 'Rename', icon: <IconPencil size={24} />, onClick: onRename },
              { label: 'Delete Game', icon: <IconTrash size={24} />, danger: true, onClick: onDelete },
            ]}
          />
        )}
      </div>
      <Link to={`/game/${game.id}`}>
        <IconChevronRight size={24} className={styles.chevron} />
      </Link>
    </div>
  );
}
