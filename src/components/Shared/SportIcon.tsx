import { IconBallBasketball, IconBallFootball } from '@tabler/icons-react';
import type { SportId } from '../../types';

interface Props {
  sport: SportId;
  size?: number;
  className?: string;
}

export function SportIcon({ sport, size = 24, className }: Props) {
  return sport === 'basketball'
    ? <IconBallBasketball size={size} className={className} />
    : <IconBallFootball size={size} className={className} />;
}
