import { useEffect, useRef, useState, type ReactNode } from 'react';
import { IconX } from '@tabler/icons-react';
import { IconButton } from './IconButton';
import { Button } from './Button';
import styles from './FormModal.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
  icon: ReactNode;
  title: string;
  bodyText: string;
  placeholder: string;
  initialValue?: string;
  confirmLabel: string;
  onConfirm: (value: string) => void;
  /** Returns an error message to show under the input, or null if the value is fine. */
  validate?: (value: string) => string | null;
}

export function FormModal({ open, onClose, icon, title, bodyText, placeholder, initialValue, confirmLabel, onConfirm, validate }: Props) {
  // No effect resets `value` on open — callers remount this component (via a
  // `key` that changes per modal purpose) so this initial state is always fresh.
  const [value, setValue] = useState(initialValue ?? '');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function handleConfirm() {
    const trimmed = value.trim();
    if (!trimmed) return;
    const problem = validate?.(trimmed) ?? null;
    if (problem) { setError(problem); return; }
    onConfirm(trimmed);
  }

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            {icon}
            <span className={styles.title}>{title}</span>
          </div>
          <IconButton icon={<IconX size={24} />} onClick={onClose} title="Close" />
        </div>
        <p className={styles.bodyText}>{bodyText}</p>
        <input
          ref={inputRef}
          className={[styles.input, error && styles.inputError].filter(Boolean).join(' ')}
          placeholder={placeholder}
          value={value}
          maxLength={30}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'form-modal-error' : undefined}
          onChange={e => { setValue(e.target.value); setError(null); }}
          onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); }}
        />
        {error && <p id="form-modal-error" className={styles.error} role="alert">{error}</p>}
        <div className={styles.footer}>
          <Button variant="secondary" onClick={onClose}>Go Back</Button>
          <Button variant="primary" onClick={handleConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
