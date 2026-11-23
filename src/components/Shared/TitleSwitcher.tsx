import { useRef, useState } from 'react';
import { IconChevronDown } from '@tabler/icons-react';
import { DropdownMenu, type DropdownItem } from './DropdownMenu';
import styles from './TitleSwitcher.module.css';

interface Props {
  /** Shown as-is; callers uppercase it to match their header. */
  title: string;
  /** Where the title can switch to. Empty: a plain title, no chevron or menu. */
  items: DropdownItem[];
  /** Brand-teal item icons (the team switcher's sport icons) instead of the default grey. */
  accentIcons?: boolean;
}

/**
 * A page-header title that doubles as a switcher: the title plus a chevron opens a
 * page-wide menu that slides out from under the header.
 *
 * Must sit inside a sticky (or otherwise positioned) header, which the menu
 * positions against, with no positioned element in between.
 */
export function TitleSwitcher({ title, items, accentIcons }: Props) {
  // 'closing' keeps the menu mounted while it slides back up under the header.
  const [menu, setMenu] = useState<'closed' | 'open' | 'closing'>('closed');
  const open = menu === 'open';
  const buttonRef = useRef<HTMLButtonElement>(null);

  if (items.length === 0) return <span className={styles.title}>{title}</span>;

  function close() {
    // Without the slide there's no animationend to finish the close on.
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    setMenu(m => (m === 'closed' ? m : reduceMotion ? 'closed' : 'closing'));
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={styles.button}
        onClick={() => (open ? close() : setMenu('open'))}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className={styles.title}>{title}</span>
        <IconChevronDown size={24} className={[styles.chevron, open ? styles.chevronOpen : ''].filter(Boolean).join(' ')} />
      </button>
      {menu !== 'closed' && (
        <div className={styles.clip} onAnimationEnd={() => setMenu(m => (m === 'closing' ? 'closed' : m))}>
          <DropdownMenu
            className={[
              styles.menu,
              menu === 'closing' ? styles.closing : '',
              accentIcons ? styles.accentIcons : '',
            ].filter(Boolean).join(' ')}
            triggerRef={buttonRef}
            onClose={close}
            items={items}
          />
        </div>
      )}
    </>
  );
}
