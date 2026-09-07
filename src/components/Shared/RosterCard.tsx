import { useState } from 'react';
import { IconUser, IconDots, IconPencil, IconTrash, IconUserOff, IconUserCheck } from '@tabler/icons-react';
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

  return (
    <div className={styles.card}>
      <IconUser size={24} className={[styles.icon, player.active ? '' : styles.inactive].join(' ')} />
      <span className={[styles.name, player.active ? '' : styles.inactive].join(' ')}>{player.name}</span>
      <div className={styles.menuWrap}>
        <IconButton icon={<IconDots size={24} />} onClick={() => setMenuOpen(o => !o)} title="Player options" />
        {menuOpen && (
          <DropdownMenu
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
    </div>
  );
}
