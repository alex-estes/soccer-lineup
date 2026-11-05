import { useState } from 'react';
import { IconX } from '@tabler/icons-react';
import { IconButton } from '../Shared/IconButton';
import { Button } from '../Shared/Button';
import { Stepper } from '../Shared/Stepper';
import { SportIcon } from '../Shared/SportIcon';
import { MAX_POSITION_COUNT, MAX_ROTATIONS, MIN_ROTATIONS, playersOnField } from '../../constants';
import type { Game, PositionDef, SportId, TeamSettings } from '../../types';
import formStyles from '../Shared/FormModal.module.css';
import rowStyles from '../../pages/Settings/SettingsPage.module.css';
import styles from './GameSettingsModal.module.css';

interface Props {
  open: boolean;
  game: Game;
  sport: SportId;
  /** The team's defaults, offered as a one-tap reset. */
  teamSettings: TeamSettings;
  onClose: () => void;
  onConfirm: (positions: PositionDef[], rotationCount: number) => void;
}

function sameLineup(a: PositionDef[], b: PositionDef[]): boolean {
  return a.length === b.length && a.every((p, i) => p.id === b[i].id && p.count === b[i].count);
}

export function GameSettingsModal({ open, game, sport, teamSettings, onClose, onConfirm }: Props) {
  // No effect resets these on open — the caller remounts this component (via a `key`
  // that changes per open) so the initial state is always fresh.
  const [positions, setPositions] = useState<PositionDef[]>(game.positions);
  const [rotationCount, setRotationCount] = useState(game.rotations.length);

  if (!open) return null;

  function setCount(id: string, count: number) {
    setPositions(ps => ps.map(p => p.id === id ? { ...p, count } : p));
  }

  // Changing only the number of rotations keeps every rotation already set up; changing
  // the positions rebuilds them all.
  const resets = !sameLineup(game.positions, positions);
  const unchanged = !resets && rotationCount === game.rotations.length;
  const matchesTeam = sameLineup(teamSettings.positions, positions)
    && teamSettings.positions.every((p, i) => p.name === positions[i].name)
    && rotationCount === teamSettings.rotationCount;

  return (
    <div className={formStyles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={[formStyles.card, styles.card].join(' ')}>
        <div className={formStyles.header}>
          <div className={formStyles.titleGroup}>
            <SportIcon sport={sport} />
            <span className={formStyles.title}>GAME SETTINGS</span>
          </div>
          <IconButton icon={<IconX size={24} />} onClick={onClose} title="Close" />
        </div>
        <div className={[rowStyles.list, styles.body].join(' ')}>
          <div className={rowStyles.row}>
            <span className={rowStyles.label}>Rotations</span>
            <Stepper
              value={rotationCount}
              onChange={setRotationCount}
              min={MIN_ROTATIONS}
              max={MAX_ROTATIONS}
              label="rotations"
            />
          </div>
          <div className={rowStyles.row}>
            <span className={rowStyles.label}>{sport === 'basketball' ? 'Players on Court' : 'Players on Field'}</span>
            <span className={styles.total}>{playersOnField(positions)}</span>
          </div>
          {positions.map(p => (
            <div className={rowStyles.row} key={p.id}>
              <span className={rowStyles.label}>{p.name}</span>
              <Stepper value={p.count} onChange={v => setCount(p.id, v)} max={MAX_POSITION_COUNT} label={p.name} />
            </div>
          ))}
          {!matchesTeam && (
            <Button
              variant="secondary"
              onClick={() => {
                setPositions(teamSettings.positions.map(p => ({ ...p })));
                setRotationCount(teamSettings.rotationCount);
              }}
            >
              Use Team Defaults
            </Button>
          )}
          {resets && (
            <p className={styles.warning}>Changing positions clears this game's rotations.</p>
          )}
        </div>
        <div className={formStyles.footer}>
          <Button variant="secondary" onClick={onClose}>Go Back</Button>
          <Button
            variant="primary"
            onClick={() => { if (unchanged) onClose(); else onConfirm(positions, rotationCount); }}
          >
            {resets ? 'Change and Reset' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}
