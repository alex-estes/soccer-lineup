import { useEffect, useRef, type ReactNode } from 'react';
import styles from './DropdownMenu.module.css';

export interface DropdownItem {
  label: string;
  icon: ReactNode;
  danger?: boolean;
  onClick: () => void;
}

interface Props {
  items: DropdownItem[];
  onClose: () => void;
  align?: 'left' | 'right';
}

export function DropdownMenu({ items, onClose, align = 'right' }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [onClose]);

  return (
    <div className={[styles.menu, align === 'left' ? styles.alignLeft : ''].filter(Boolean).join(' ')} ref={ref}>
      {items.map(item => (
        <button
          key={item.label}
          type="button"
          className={[styles.item, item.danger ? styles.danger : ''].filter(Boolean).join(' ')}
          onClick={() => { item.onClick(); onClose(); }}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}
