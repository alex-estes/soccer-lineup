import { useEffect, useState } from 'react';
import { onSnapshot, query, where } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { migrateLegacyLineup, teamsCol } from '../lib/teamsApi';
import { normalizeTeamDoc, type TeamSnapshot } from '../state/teamDoc';

interface TeamsState {
  teams: TeamSnapshot[];
  loading: boolean;
  error: string | null;
}

/**
 * Every team the signed-in coach belongs to, live. Also performs the one-time move of a
 * pre-teams lineup into its own team, and holds `loading` until that has finished, so a
 * returning coach never sees an empty "no teams" screen while it happens.
 */
export function useTeams(user: User): TeamsState {
  const [teams, setTeams] = useState<TeamSnapshot[]>([]);
  const [snapshotReady, setSnapshotReady] = useState(false);
  const [migrationDone, setMigrationDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    migrateLegacyLineup(user)
      .catch(err => console.error('Migrating the old lineup failed', err))
      .finally(() => { if (!cancelled) setMigrationDone(true); });

    const q = query(teamsCol(), where('memberUids', 'array-contains', user.uid));
    const unsub = onSnapshot(
      q,
      snap => {
        const list = snap.docs.map(d => normalizeTeamDoc(d.id, d.data()));
        list.sort((a, b) => a.meta.name.localeCompare(b.meta.name));
        setTeams(list);
        setSnapshotReady(true);
        setError(null);
      },
      err => {
        console.error('Loading teams failed', err);
        setError('Could not load your teams. Check your connection and refresh.');
        setSnapshotReady(true);
      },
    );
    return () => { cancelled = true; unsub(); };
  }, [user]);

  return { teams, loading: !snapshotReady || !migrationDone, error };
}
