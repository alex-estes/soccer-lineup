import { IconSoccerField } from '@tabler/icons-react';
import { POS_COLORS, POS_LABELS } from '../../constants';
import { PlayerSlot } from './PlayerSlot';
import type { Position, Rotation, DragSource } from '../../types';
import styles from './PositionGroup.module.css';

interface Props {
  pos: Position;
  rIdx: number;
  rot: Rotation;
  isPlayed: boolean;
  dragRef: React.MutableRefObject<DragSource | null>;
}

export function PositionGroup({ pos, rIdx, rot, isPlayed, dragRef }: Props) {
  return (
    <div className={styles.group}>
      <div className={styles.label} style={{ color: POS_COLORS[pos] }}>
        <IconSoccerField size={24} />
        <span style={{ color: 'var(--neutral-300)' }}>{POS_LABELS[pos].toUpperCase()}</span>
      </div>
      <div className={styles.slots}>
        {rot[pos].map((_, sIdx) => (
          <PlayerSlot
            key={sIdx}
            rIdx={rIdx}
            pos={pos}
            sIdx={sIdx}
            playerName={rot[pos][sIdx]}
            locked={rot.locked[pos][sIdx]}
            isPlayed={isPlayed}
            dragRef={dragRef}
          />
        ))}
      </div>
    </div>
  );
}
