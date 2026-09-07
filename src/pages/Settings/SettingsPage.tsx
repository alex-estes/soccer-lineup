import { useState } from 'react';
import type { User } from 'firebase/auth';
import { IconBrandAppleArcade, IconSettings } from '@tabler/icons-react';
import { AppHeader } from '../../components/Shared/AppHeader';
import { Stepper } from '../../components/Shared/Stepper';
import { Button } from '../../components/Shared/Button';
import { ConfirmDialog } from '../../components/Shared/ConfirmDialog';
import { forceReload } from '../../lib/forceReload';
import { useAppState } from '../../state/AppContext';
import type { FormationSettings } from '../../types';
import subHeaderStyles from '../../components/Shared/GameSubHeader.module.css';
import styles from './SettingsPage.module.css';

interface Props {
  user: User;
  onSignOut: () => void;
}

type PositionKey = 'defenders' | 'midfielders' | 'forwards';

export function SettingsPage({ user, onSignOut }: Props) {
  const { state, dispatch } = useAppState();
  const [resetOpen, setResetOpen] = useState(false);
  const formation = state.settings.defaultFormation;

  function updateCount(key: PositionKey, value: number) {
    const next: FormationSettings = { ...formation, [key]: Math.max(0, value) };
    next.playersOnField = next.defenders + next.midfielders + next.forwards;
    dispatch({ type: 'UPDATE_FORMATION', formation: next });
  }

  return (
    <>
      <AppHeader user={user} onSignOut={onSignOut} />
      <div className={subHeaderStyles.bar}>
        <div className={subHeaderStyles.left}>
          <span className={subHeaderStyles.name}>SETTINGS</span>
        </div>
      </div>

      <main className={styles.content}>
        <section className={styles.section}>
          <div className={styles.heading}>
            <IconBrandAppleArcade size={24} />
            <span>GAME PLAY</span>
          </div>
          <div className={styles.list}>
            <div className={styles.row}>
              <span className={styles.label}>Players on Field</span>
              <Stepper value={formation.playersOnField} onChange={() => {}} min={formation.playersOnField} max={formation.playersOnField} />
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Defenders</span>
              <Stepper value={formation.defenders} onChange={v => updateCount('defenders', v)} />
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Midfielders</span>
              <Stepper value={formation.midfielders} onChange={v => updateCount('midfielders', v)} />
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Forwards</span>
              <Stepper value={formation.forwards} onChange={v => updateCount('forwards', v)} />
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.heading}>
            <IconSettings size={24} />
            <span>ADVANCED</span>
          </div>
          <div className={styles.actionRow}>
            <Button variant="secondary" onClick={forceReload}>Refresh App</Button>
            <Button variant="danger" onClick={() => setResetOpen(true)}>Reset All App Data</Button>
          </div>
        </section>
      </main>

      <ConfirmDialog
        open={resetOpen}
        title="RESET ALL"
        message="This permanently deletes your entire roster, all games, and all stats. This cannot be undone."
        confirmLabel="Reset All App Data"
        onConfirm={() => { dispatch({ type: 'RESET_ALL' }); setResetOpen(false); }}
        onCancel={() => setResetOpen(false)}
      />
    </>
  );
}
