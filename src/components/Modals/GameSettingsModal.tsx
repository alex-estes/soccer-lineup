import { useState } from 'react';
import { IconBallFootball, IconX } from '@tabler/icons-react';
import { IconButton } from '../Shared/IconButton';
import { Button } from '../Shared/Button';
import { Stepper } from '../Shared/Stepper';
import type { FormationSettings, Game } from '../../types';
import formStyles from '../Shared/FormModal.module.css';
import rowStyles from '../../pages/Settings/SettingsPage.module.css';

interface Props {
  open: boolean;
  game: Game;
  onClose: () => void;
  onConfirm: (formation: FormationSettings) => void;
}

type PositionKey = 'defenders' | 'midfielders' | 'forwards';

export function GameSettingsModal({ open, game, onClose, onConfirm }: Props) {
  // No effect resets `formation` on open — the caller remounts this component
  // (via a `key` that changes per open) so this initial state is always fresh,
  // matching the pattern FormModal uses for the same reason.
  const [formation, setFormation] = useState<FormationSettings>(game.formation);

  if (!open) return null;

  function updateCount(key: PositionKey, value: number) {
    const next: FormationSettings = { ...formation, [key]: Math.max(0, value) };
    next.playersOnField = next.defenders + next.midfielders + next.forwards;
    setFormation(next);
  }

  return (
    <div className={formStyles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={formStyles.card}>
        <div className={formStyles.header}>
          <div className={formStyles.titleGroup}>
            <IconBallFootball size={24} />
            <span className={formStyles.title}>GAME SETTINGS</span>
          </div>
          <IconButton icon={<IconX size={24} />} onClick={onClose} title="Close" />
        </div>
        <div className={rowStyles.list}>
          <div className={rowStyles.row}>
            <span className={rowStyles.label}>Players on Field</span>
            <Stepper value={formation.playersOnField} onChange={() => {}} min={formation.playersOnField} max={formation.playersOnField} />
          </div>
          <div className={rowStyles.row}>
            <span className={rowStyles.label}>Defenders</span>
            <Stepper value={formation.defenders} onChange={v => updateCount('defenders', v)} />
          </div>
          <div className={rowStyles.row}>
            <span className={rowStyles.label}>Midfielders</span>
            <Stepper value={formation.midfielders} onChange={v => updateCount('midfielders', v)} />
          </div>
          <div className={rowStyles.row}>
            <span className={rowStyles.label}>Forwards</span>
            <Stepper value={formation.forwards} onChange={v => updateCount('forwards', v)} />
          </div>
        </div>
        <div className={formStyles.footer}>
          <Button variant="secondary" onClick={onClose}>Go Back</Button>
          <Button variant="primary" onClick={() => onConfirm(formation)}>Change and Reset</Button>
        </div>
      </div>
    </div>
  );
}
