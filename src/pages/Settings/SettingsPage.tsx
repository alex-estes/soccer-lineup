import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { User } from 'firebase/auth';
import { IconArrowLeft, IconBrandAppleArcade } from '@tabler/icons-react';
import { AppHeader } from '../../components/Shared/AppHeader';
import { Stepper } from '../../components/Shared/Stepper';
import { Button } from '../../components/Shared/Button';
import { ConfirmDialog } from '../../components/Shared/ConfirmDialog';
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
          <Link to="/" className={subHeaderStyles.backLink} aria-label="Back to Home">
            <IconArrowLeft size={24} />
          </Link>
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

        <div className={styles.actionRow}>
          <Button variant="danger" onClick={() => setResetOpen(true)}>Reset All</Button>
        </div>
      </main>

      <ConfirmDialog
        open={resetOpen}
        title="RESET ALL"
        message="This permanently deletes your entire roster, all games, and all stats. This cannot be undone."
        confirmLabel="Reset All"
        onConfirm={() => { dispatch({ type: 'RESET_ALL' }); setResetOpen(false); }}
        onCancel={() => setResetOpen(false)}
      />
    </>
  );
}
