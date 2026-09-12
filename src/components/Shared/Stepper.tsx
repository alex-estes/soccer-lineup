import { IconMinus, IconPlus } from '@tabler/icons-react';
import styles from './Stepper.module.css';

interface Props {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Renders the display label for `value`. Defaults to the number itself. */
  format?: (value: number) => string;
  /** What is being stepped — used for the buttons' accessible titles. */
  label?: string;
}

export function Stepper({ value, onChange, min = 0, max = Infinity, format, label }: Props) {
  return (
    <div className={styles.stepper}>
      <button
        type="button"
        className={styles.btn}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        title={label ? `Decrease ${label}` : 'Decrease'}
      >
        <IconMinus size={16} />
      </button>
      <span className={styles.value}>{format ? format(value) : value}</span>
      <button
        type="button"
        className={styles.btn}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        title={label ? `Increase ${label}` : 'Increase'}
      >
        <IconPlus size={16} />
      </button>
    </div>
  );
}
