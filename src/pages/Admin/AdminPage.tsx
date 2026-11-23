import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { IconChartBar } from '@tabler/icons-react';
import type { User } from 'firebase/auth';
import { DetailHeader } from '../../components/Shared/DetailHeader';
import { StatTile } from '../../components/Shared/StatTile';
import { isAdmin, ratedPercent, type AdminStats } from '../../lib/admin';
import { fetchAdminStats } from '../../lib/adminApi';
import styles from './AdminPage.module.css';

type Load = { status: 'loading' } | { status: 'error' } | { status: 'ready'; stats: AdminStats };

/** App-wide counts for the owner. Numbers only — no team, coach or player names. */
export function AdminPage({ user }: { user: User }) {
  const allowed = isAdmin(user);
  const [load, setLoad] = useState<Load>({ status: 'loading' });

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    fetchAdminStats()
      .then(stats => { if (!cancelled) setLoad({ status: 'ready', stats }); })
      .catch(err => {
        // A missing index or a rules problem shows up here, with Firebase's fix-it link.
        console.error('Admin stats failed:', err);
        if (!cancelled) setLoad({ status: 'error' });
      });
    return () => { cancelled = true; };
  }, [allowed]);

  if (!allowed) return <Navigate to="/" replace />;

  const s = load.status === 'ready' ? load.stats : null;
  const show = (n: number | undefined) => (s ? String(n) : '…');

  return (
    <>
      <DetailHeader title="Admin" />
      <main className={styles.content}>
        <section className={styles.section}>
          <div className={styles.sectionTitle}>
            <IconChartBar size={24} />
            <span>APP USAGE</span>
          </div>
          {load.status === 'error' ? (
            <p className={styles.message}>Couldn't load the numbers. Check your connection and try again.</p>
          ) : (
            <>
              <div className={styles.statsRow}>
                <StatTile tone="teal" value={show(s?.coaches)} label="COACHES" />
                <StatTile tone="neutral" value={show(s?.teams)} label="TEAMS" />
              </div>
              <div className={styles.statsRow}>
                <StatTile tone="neutral" value={show(s?.games)} label="GAMES" />
                <StatTile tone="neutral" value={show(s?.completedGames)} label="COMPLETED" />
              </div>
              <div className={styles.statsRow}>
                <StatTile tone="neutral" value={show(s?.players)} label="PLAYERS" />
                <StatTile tone="teal" value={s ? ratedPercent(s) : '…'} label="RATED" />
              </div>
            </>
          )}
        </section>
      </main>
    </>
  );
}
