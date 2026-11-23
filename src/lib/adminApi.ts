import { collectionGroup, getCountFromServer, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { teamsCol } from './teamsApi';
import { computeAdminStats, type AdminStats } from './admin';

/**
 * Everything the admin page shows. Reads every team document once (rosters are needed
 * for the player counts) and counts games server-side without downloading them.
 * Only the admin account passes the security rules for these queries. The completed
 * count needs the collection-group index on games.completed in firestore.indexes.json.
 */
export async function fetchAdminStats(): Promise<AdminStats> {
  const games = collectionGroup(db, 'games');
  const [teams, total, completed] = await Promise.all([
    getDocs(teamsCol()),
    getCountFromServer(games),
    getCountFromServer(query(games, where('completed', '==', true))),
  ]);
  return computeAdminStats(
    teams.docs.map(d => d.data()),
    { total: total.data().count, completed: completed.data().count },
  );
}
