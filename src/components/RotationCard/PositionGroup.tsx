import { IconAlertTriangleFilled, IconSoccerField, IconBallBasketball } from '@tabler/icons-react';
import { useAppState } from '../../state/AppContext';
import { isLineOverCap } from '../../lib/skills';
import { Chip } from '../Shared/Chip';
import { PlayerSlot } from './PlayerSlot';
import type { PositionDef, Rotation } from '../../types';
import styles from './PositionGroup.module.css';

interface Props {
  pos: PositionDef;
  color: string;
  rIdx: number;
  rot: Rotation;
  isPlayed: boolean;
}

export function PositionGroup({ pos, color, rIdx, rot, isPlayed }: Props) {
  const { state } = useAppState();
  // Derived at render, so a lineup edited by hand gets flagged too — not just
  // one the generator produced.
  const weak = state.settings.useSkillRatings && isLineOverCap(state.players, rot, pos);
  const slots = rot.slots[pos.id] ?? [];
  const Icon = state.team.sport === 'basketball' ? IconBallBasketball : IconSoccerField;

  return (
    <div className={styles.group}>
      <div className={styles.label} style={{ color }}>
        <Icon size={24} />
        <span style={{ color: 'var(--neutral-300)' }}>{pos.name.toUpperCase()}</span>
        {weak && (
          <Chip tone="warning" size="sm">
            <IconAlertTriangleFilled size={14} />
            WEAK
          </Chip>
        )}
      </div>
      <div className={styles.slots}>
        {slots.map((name, sIdx) => (
          <PlayerSlot
            key={sIdx}
            rIdx={rIdx}
            pos={pos.id}
            skill={pos.skill}
            sIdx={sIdx}
            playerName={name}
            locked={rot.locked[pos.id]?.[sIdx] ?? false}
            isPlayed={isPlayed}
          />
        ))}
      </div>
    </div>
  );
}
