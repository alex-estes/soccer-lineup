import { useEffect, useRef } from 'react';
import { IconPrinter, IconTrash } from '@tabler/icons-react';

interface Props {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onClear: () => void;
}

export function HeaderMenu({ open, onToggle, onClose, onClear }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [onClose]);

  return (
    <div className="header-menu-wrap" ref={wrapRef}>
      <button className="btn btn-secondary" onClick={onToggle} title="Menu">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
        </svg>
      </button>
      <div className={`header-dropdown${open ? ' open' : ''}`}>
        <button onClick={() => { window.print(); onClose(); }}>
          <IconPrinter size={16} /> Print
        </button>
        <button onClick={() => { onClear(); onClose(); }}>
          <IconTrash size={16} /> Clear
        </button>
      </div>
    </div>
  );
}
