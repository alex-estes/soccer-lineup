import { useEffect, useRef } from 'react';
import { IconPrinter, IconTrash, IconLogout } from '@tabler/icons-react';
import type { User } from 'firebase/auth';

interface Props {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onClear: () => void;
  user: User;
  onSignOut: () => void;
}

export function HeaderMenu({ open, onToggle, onClose, onClear, user, onSignOut }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [onClose]);

  const initials = user.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user.email?.[0]?.toUpperCase() ?? '?';

  return (
    <div className="header-menu-wrap" ref={wrapRef}>
      <button className="header-avatar-btn" onClick={onToggle} title={user.displayName ?? user.email ?? 'Account'}>
        {user.photoURL
          ? <img src={user.photoURL} alt={initials} className="header-avatar-img" referrerPolicy="no-referrer" />
          : <span className="header-avatar-initials">{initials}</span>
        }
      </button>
      <div className={`header-dropdown${open ? ' open' : ''}`}>
        <div className="header-dropdown-user">
          <span className="header-dropdown-name">{user.displayName ?? 'Coach'}</span>
          <span className="header-dropdown-email">{user.email}</span>
        </div>
        <div className="header-dropdown-divider" />
        <button onClick={() => { window.print(); onClose(); }}>
          <IconPrinter size={16} /> Print
        </button>
        <button onClick={() => { onClear(); onClose(); }}>
          <IconTrash size={16} /> Clear
        </button>
        <div className="header-dropdown-divider" />
        <button className="header-dropdown-signout" onClick={() => { onSignOut(); onClose(); }}>
          <IconLogout size={16} /> Sign out
        </button>
      </div>
    </div>
  );
}
