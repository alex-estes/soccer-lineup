import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { IconMenu2, IconUser, IconLogout } from '@tabler/icons-react';
import type { User } from 'firebase/auth';
import { DropdownMenu } from './DropdownMenu';
import styles from './AppHeader.module.css';

interface Props {
  user: User;
  onSignOut: () => void;
  /** Rendered where the title normally sits — for pages that need a back arrow + custom title instead. */
  center?: ReactNode;
}

export function AppHeader({ user, onSignOut, center }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className={styles.header}>
      <Link to="/settings" className={styles.menuLink} aria-label="Settings">
        <IconMenu2 size={24} />
      </Link>
      {center ?? <span className={styles.title}>SOCCER LINEUP</span>}
      <div className={styles.avatarWrap}>
        <button type="button" className={styles.avatarButton} onClick={() => setMenuOpen(o => !o)} title={user.displayName ?? 'Account'}>
          {user.photoURL ? (
            <img className={styles.avatarImg} src={user.photoURL} alt="" />
          ) : (
            <span className={styles.avatarFallback}><IconUser size={20} /></span>
          )}
        </button>
        {menuOpen && (
          <DropdownMenu
            onClose={() => setMenuOpen(false)}
            items={[{ label: 'Sign Out', icon: <IconLogout size={24} />, onClick: onSignOut }]}
          />
        )}
      </div>
    </header>
  );
}
