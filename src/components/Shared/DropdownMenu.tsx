import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import styles from './DropdownMenu.module.css';

export interface DropdownItem {
  /** Defaults to `label`; set it when labels can repeat (e.g. two teams with one name). */
  key?: string;
  label: string;
  icon: ReactNode;
  danger?: boolean;
  onClick: () => void;
}

interface Props {
  items: DropdownItem[];
  onClose: () => void;
  align?: 'left' | 'right';
  /**
   * The button that toggles this menu. Taps on it are left to its own onClick —
   * otherwise the outside-tap close and the toggle both fire, and it reopens.
   */
  triggerRef?: RefObject<HTMLElement | null>;
  className?: string;
}

export function DropdownMenu({ items, onClose, align = 'right', triggerRef, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef?.current?.contains(target)) return;
      if (ref.current && !ref.current.contains(target)) onClose();
    }
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [onClose, triggerRef]);

  return (
    <div className={[styles.menu, align === 'left' ? styles.alignLeft : '', className ?? ''].filter(Boolean).join(' ')} ref={ref}>
      {items.map(item => (
        <button
          key={item.key ?? item.label}
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
