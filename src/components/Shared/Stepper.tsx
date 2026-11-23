import type { ReactNode } from 'react';
import { IconMinus, IconPlus } from '@tabler/icons-react';
import { IconButton } from './IconButton';
import styles from './Stepper.module.css';

interface Props {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Renders the display label for `value`. Defaults to the number itself. */
  format?: (value: number) => ReactNode;
  /** What is being stepped — used for the buttons' accessible titles. */
  label?: string;
}

export function Stepper({ value, onChange, min = 0, max = Infinity, format, label }: Props) {
  return (
    <div className={styles.stepper}>
      <IconButton
        variant="outline"
        icon={<IconMinus size={24} />}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        title={label ? `Decrease ${label}` : 'Decrease'}
      />
      <span className={styles.value}>{format ? format(value) : value}</span>
      <IconButton
        variant="outline"
        icon={<IconPlus size={24} />}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        title={label ? `Increase ${label}` : 'Increase'}
      />
    </div>
  );
}
