import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconUser, IconDots, IconPencil, IconTrash, IconUserOff, IconUserCheck, IconChevronRight } from '@tabler/icons-react';
import { IconButton } from './IconButton';
import { DropdownMenu } from './DropdownMenu';
import type { Player } from '../../types';
import styles from './RosterCard.module.css';

interface Props {
  player: Player;
  onRename: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}

export function RosterCard({ player, onRename, onDelete, onToggleActive }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  // Holds the ⋯ button and the menu, so a second tap on ⋯ closes it.
  const menuWrapRef = useRef<HTMLDivElement>(null);

  const playerPath = `/player/${encodeURIComponent(player.name)}`;

  return (
    <div className={styles.card}>
      {/* Like GameCard: the icon and name open the player too, not just the chevron. */}
      <Link to={playerPath} className={styles.link}>
        <IconUser size={24} className={[styles.icon, player.active ? '' : styles.inactive].join(' ')} />
        <span className={[styles.name, player.active ? '' : styles.inactive].join(' ')}>{player.name}</span>
      </Link>
      <div ref={menuWrapRef} className={styles.menuWrap}>
        <IconButton icon={<IconDots size={24} />} onClick={() => setMenuOpen(o => !o)} title="Player options" />
        {menuOpen && (
          <DropdownMenu
            triggerRef={menuWrapRef}
            onClose={() => setMenuOpen(false)}
            items={[
              { label: 'Rename', icon: <IconPencil size={24} />, onClick: onRename },
              {
                label: player.active ? 'Mark Inactive' : 'Mark Active',
                icon: player.active ? <IconUserOff size={24} /> : <IconUserCheck size={24} />,
                onClick: onToggleActive,
              },
              { label: 'Delete Player', icon: <IconTrash size={24} />, danger: true, onClick: onDelete },
            ]}
          />
        )}
      </div>
      <Link
        to={playerPath}
        className={styles.chevronLink}
        aria-label={`View ${player.name}`}
      >
        <IconChevronRight size={24} className={styles.chevron} />
      </Link>
    </div>
  );
}
