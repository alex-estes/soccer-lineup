import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconMenu2, IconUser, IconLogout, IconHome, IconSettings } from '@tabler/icons-react';
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
  const [navOpen, setNavOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className={styles.header}>
      <div className={styles.navWrap}>
        <button type="button" className={styles.menuButton} onClick={() => setNavOpen(o => !o)} aria-label="Menu">
          <IconMenu2 size={24} />
        </button>
        {navOpen && (
          <DropdownMenu
            align="left"
            onClose={() => setNavOpen(false)}
            items={[
              { label: 'Home', icon: <IconHome size={24} />, onClick: () => navigate('/') },
              { label: 'Settings', icon: <IconSettings size={24} />, onClick: () => navigate('/settings') },
            ]}
          />
        )}
      </div>
      {center ?? <span className={styles.title}>SOCCER LINEUP</span>}
      <div className={styles.avatarWrap}>
        <button type="button" className={styles.avatarButton} onClick={() => setAvatarOpen(o => !o)} title={user.displayName ?? 'Account'}>
          {user.photoURL ? (
            <img className={styles.avatarImg} src={user.photoURL} alt="" />
          ) : (
            <span className={styles.avatarFallback}><IconUser size={20} /></span>
          )}
        </button>
        {avatarOpen && (
          <DropdownMenu
            onClose={() => setAvatarOpen(false)}
            items={[{ label: 'Sign Out', icon: <IconLogout size={24} />, onClick: onSignOut }]}
          />
        )}
      </div>
    </header>
  );
}
