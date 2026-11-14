import { useEffect } from 'react';
import { IconAlertTriangle } from '@tabler/icons-react';
import { Button } from './Button';
import formStyles from './FormModal.module.css';

interface Props {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

/** One-button dialog for telling the coach something — the app's replacement for alert(). */
export function NoticeDialog({ open, title, message, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' || e.key === 'Enter') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={formStyles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={formStyles.card} role="alertdialog" aria-label={title}>
        <div className={formStyles.titleGroup}>
          <IconAlertTriangle size={24} color="var(--color-warning)" />
          <span className={formStyles.title}>{title}</span>
        </div>
        <p className={formStyles.bodyText}>{message}</p>
        <div className={formStyles.footer}>
          <Button variant="primary" onClick={onClose}>Got it</Button>
        </div>
      </div>
    </div>
  );
}
