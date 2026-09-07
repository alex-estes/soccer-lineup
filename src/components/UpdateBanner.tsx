import { useState } from 'react';
import { IconRefresh, IconX } from '@tabler/icons-react';
import { useAppUpdateCheck } from '../hooks/useAppUpdateCheck';
import { forceReload } from '../lib/forceReload';
import styles from './UpdateBanner.module.css';

export function UpdateBanner() {
  const updateAvailable = useAppUpdateCheck();
  const [dismissed, setDismissed] = useState(false);

  if (!updateAvailable || dismissed) return null;

  return (
    <div className={styles.bar}>
      <span className={styles.text}>Update available</span>
      <button type="button" className={styles.refreshBtn} onClick={forceReload}>
        <IconRefresh size={18} />
        Tap to refresh
      </button>
      <button type="button" className={styles.dismissBtn} onClick={() => setDismissed(true)} aria-label="Dismiss">
        <IconX size={18} />
      </button>
    </div>
  );
}
