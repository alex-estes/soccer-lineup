import { Link } from 'react-router-dom';
import { IconArrowLeft } from '@tabler/icons-react';
import styles from './DetailHeader.module.css';

interface Props {
  title: string;
  backTo?: string;
}

export function DetailHeader({ title, backTo = '/' }: Props) {
  return (
    <header className={styles.header}>
      <Link to={backTo} className={styles.iconButton} aria-label="Back">
        <IconArrowLeft size={24} />
      </Link>
      <span className={styles.title}>{title}</span>
      {/* Mirrors the back button's width so the title is optically centred. */}
      <span className={styles.spacer} aria-hidden="true" />
    </header>
  );
}
