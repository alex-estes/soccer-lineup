import { useEffect } from 'react';
import { IconAlertTriangle } from '@tabler/icons-react';
import { Button } from './Button';
import formStyles from './FormModal.module.css';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onCancel }: Props) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className={formStyles.overlay} onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className={formStyles.card}>
        <div className={formStyles.titleGroup}>
          <IconAlertTriangle size={24} color="var(--color-danger)" />
          <span className={formStyles.title}>{title}</span>
        </div>
        <p className={formStyles.bodyText}>{message}</p>
        <div className={formStyles.footer}>
          <Button variant="secondary" onClick={onCancel}>Go Back</Button>
          <Button variant="danger" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
