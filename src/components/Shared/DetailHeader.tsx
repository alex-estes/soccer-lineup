import { Link } from 'react-router-dom';
import { IconArrowLeft } from '@tabler/icons-react';
import type { DropdownItem } from './DropdownMenu';
import { TitleSwitcher } from './TitleSwitcher';
import styles from './DetailHeader.module.css';

interface Props {
  title: string;
  backTo?: string;
  /** Siblings to switch to from the title (e.g. the team's other players). */
  switchItems?: DropdownItem[];
}

export function DetailHeader({ title, backTo = '/', switchItems = [] }: Props) {
  return (
    <header className={styles.header}>
      <Link to={backTo} className={styles.iconButton} aria-label="Back">
        <IconArrowLeft size={24} />
      </Link>
      <div className={styles.titleSlot}>
        <TitleSwitcher title={title.toUpperCase()} items={switchItems} />
      </div>
      {/* Mirrors the back button's width so the title is optically centred. */}
      <span className={styles.spacer} aria-hidden="true" />
    </header>
  );
}
