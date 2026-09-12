import { IconAlertTriangleFilled, IconSoccerField } from '@tabler/icons-react';
import { POS_COLORS, POS_LABELS } from '../../constants';
import { useAppState } from '../../state/AppContext';
import { isLineOverCap } from '../../lib/skills';
import { Chip } from '../Shared/Chip';
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
  const { state } = useAppState();
  // Derived at render, so a lineup edited by hand gets flagged too — not just
  // one the generator produced.
  const weak = state.settings.useSkillRatings && isLineOverCap(state.players, rot, pos);

  return (
    <div className={styles.group}>
      <div className={styles.label} style={{ color: POS_COLORS[pos] }}>
        <IconSoccerField size={24} />
        <span style={{ color: 'var(--neutral-300)' }}>{POS_LABELS[pos].toUpperCase()}</span>
        {weak && (
          <Chip tone="warning" size="sm">
            <IconAlertTriangleFilled size={14} />
            WEAK
          </Chip>
        )}
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
