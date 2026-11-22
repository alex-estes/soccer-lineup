import { useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconMenu, IconUser, IconLogout, IconHome, IconSettings, IconUsersGroup, IconChevronDown,
} from '@tabler/icons-react';
import type { User } from 'firebase/auth';
import { DropdownMenu } from './DropdownMenu';
import { SportIcon } from './SportIcon';
import { useTeamSwitcher } from '../../state/TeamSwitcherContext';
import styles from './AppHeader.module.css';

interface Props {
  user: User;
  onSignOut: () => void;
  /** Rendered where the title normally sits — for pages that need a back arrow + custom title instead. */
  center?: ReactNode;
  /** The open team's name. Without one (the Teams page) the header has no team links. */
  title?: string;
}

export function AppHeader({ user, onSignOut, center, title }: Props) {
  const [navOpen, setNavOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [teamsOpen, setTeamsOpen] = useState(false);
  const navRef = useRef<HTMLButtonElement>(null);
  const avatarRef = useRef<HTMLButtonElement>(null);
  const teamsRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const switcher = useTeamSwitcher();
  // Only on a team's pages (`title` set), and only when there's somewhere else to go.
  const otherTeams = title !== undefined && switcher
    ? switcher.teams.filter(t => t.meta.id !== switcher.activeId)
    : [];

  const titleText = (title ?? 'Teams').toUpperCase();

  return (
    <header className={styles.header}>
      <div className={styles.navWrap}>
        <button ref={navRef} type="button" className={styles.menuButton} onClick={() => setNavOpen(o => !o)} aria-label="Menu">
          <IconMenu size={24} />
        </button>
        {navOpen && (
          <DropdownMenu
            align="left"
            triggerRef={navRef}
            onClose={() => setNavOpen(false)}
            items={[
              ...(title !== undefined ? [
                { label: 'Home', icon: <IconHome size={24} />, onClick: () => navigate('/') },
                { label: 'Team Settings', icon: <IconSettings size={24} />, onClick: () => navigate('/settings') },
              ] : []),
              { label: 'Switch Team', icon: <IconUsersGroup size={24} />, onClick: () => navigate('/teams') },
            ]}
          />
        )}
      </div>
      {center ?? (otherTeams.length > 0 ? (
        <>
          <button
            ref={teamsRef}
            type="button"
            className={styles.titleButton}
            onClick={() => setTeamsOpen(o => !o)}
            aria-haspopup="menu"
            aria-expanded={teamsOpen}
          >
            <span className={styles.title}>{titleText}</span>
            <IconChevronDown size={24} className={[styles.chevron, teamsOpen ? styles.chevronOpen : ''].filter(Boolean).join(' ')} />
          </button>
          {teamsOpen && (
            <DropdownMenu
              className={styles.teamMenu}
              triggerRef={teamsRef}
              onClose={() => setTeamsOpen(false)}
              items={otherTeams.map(t => ({
                key: t.meta.id,
                label: t.meta.name,
                icon: <SportIcon sport={t.meta.sport} className={styles.teamIcon} />,
                onClick: () => { switcher?.onSelect(t.meta.id); navigate('/'); },
              }))}
            />
          )}
        </>
      ) : (
        <span className={styles.title}>{titleText}</span>
      ))}
      <div className={styles.avatarWrap}>
        <button ref={avatarRef} type="button" className={styles.avatarButton} onClick={() => setAvatarOpen(o => !o)} title={user.displayName ?? 'Account'}>
          {user.photoURL ? (
            <img className={styles.avatarImg} src={user.photoURL} alt="" />
          ) : (
            <span className={styles.avatarFallback}><IconUser size={20} /></span>
          )}
        </button>
        {avatarOpen && (
          <DropdownMenu
            triggerRef={avatarRef}
            onClose={() => setAvatarOpen(false)}
            items={[{ label: 'Sign Out', icon: <IconLogout size={24} />, onClick: onSignOut }]}
          />
        )}
      </div>
    </header>
  );
}
