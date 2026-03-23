import { POS_COLORS, POS_LABELS, SLOTS_PER } from '../../constants';
import { PlayerSlot } from './PlayerSlot';
import type { Position, Rotation, DragSource } from '../../types';

interface Props {
  pos: Position;
  rIdx: number;
  rot: Rotation;
  isPlayed: boolean;
  dragRef: React.MutableRefObject<DragSource | null>;
}

export function PositionGroup({ pos, rIdx, rot, isPlayed, dragRef }: Props) {
  return (
    <div className="position-group">
      <div className="position-label">
        <div className="pos-dot" style={{ background: POS_COLORS[pos] }} />
        {POS_LABELS[pos]}
      </div>
      <div className="position-slots">
        {Array.from({ length: SLOTS_PER }, (_, sIdx) => (
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
