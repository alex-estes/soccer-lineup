import { useCallback, useRef, useState } from 'react';
import { IconCheck, IconChevronDown } from '@tabler/icons-react';
import { DropdownMenu } from './DropdownMenu';
import styles from './Select.module.css';

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  /** Accessible name for the trigger, e.g. "Forwards rated by". */
  label?: string;
}

/**
 * The app's stand-in for a native <select>: a Button-height trigger with the same
 * chevron as the title switcher, opening the shared DropdownMenu. The current
 * choice is marked with a check.
 */
export function Select({ value, options, onChange, label }: Props) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const current = options.find(o => o.value === value);

  return (
    <div className={styles.wrap}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.button}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label ? `${label}: ${current?.label ?? value}` : undefined}
      >
        <span className={styles.value}>{current?.label ?? value}</span>
        <IconChevronDown size={24} className={[styles.chevron, open ? styles.chevronOpen : ''].filter(Boolean).join(' ')} />
      </button>
      {open && (
        <DropdownMenu
          align="left"
          className={styles.menu}
          triggerRef={buttonRef}
          onClose={close}
          items={options.map(o => ({
            key: o.value,
            label: o.label,
            icon: o.value === value
              ? <IconCheck size={24} className={styles.check} />
              : <span className={styles.iconSpacer} />,
            onClick: () => { if (o.value !== value) onChange(o.value); },
          }))}
        />
      )}
    </div>
  );
}
