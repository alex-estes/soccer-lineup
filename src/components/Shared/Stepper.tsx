import { IconMinus, IconPlus } from '@tabler/icons-react';
import styles from './Stepper.module.css';

interface Props {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export function Stepper({ value, onChange, min = 0, max = Infinity }: Props) {
  return (
    <div className={styles.stepper}>
      <button
        type="button"
        className={styles.btn}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        title="Decrease"
      >
        <IconMinus size={16} />
      </button>
      <span className={styles.value}>{value}</span>
      <button
        type="button"
        className={styles.btn}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        title="Increase"
      >
        <IconPlus size={16} />
      </button>
    </div>
  );
}
