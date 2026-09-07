import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './IconButton.module.css';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  variant?: 'ghost' | 'outline' | 'danger';
}

export function IconButton({ icon, variant = 'ghost', className, ...rest }: Props) {
  const variantClass = variant === 'outline' ? styles.outline : variant === 'danger' ? styles.danger : '';
  return (
    <button type="button" className={[styles.button, variantClass, className].filter(Boolean).join(' ')} {...rest}>
      {icon}
    </button>
  );
}
