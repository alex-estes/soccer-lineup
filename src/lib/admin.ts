import type { User } from 'firebase/auth';
import { clampLevel } from './skills';

/**
 * The app owner. Must match isAdmin() in firestore.rules, which is what actually guards
 * the data — this only decides whether the Admin link and page are shown. A uid only
 * identifies an account; it is not a secret.
 */
export const ADMIN_UID = 'DP2b237SQCQWPBMstuNAouiEzzJ2';

export function isAdmin(user: User | null | undefined): boolean {
  return user?.uid === ADMIN_UID;
}

export interface AdminStats {
  coaches: number;
  teams: number;
  games: number;
  completedGames: number;
  players: number;
  ratedPlayers: number;
}

/** A team document as stored, read defensively — this sees every team, old ones included. */
export type RawTeam = Record<string, unknown>;

/** A player counts as rated once any one of their ratings is set. */
function isRated(player: unknown): boolean {
  const skills = (player as { skills?: unknown } | null)?.skills;
  if (!skills || typeof skills !== 'object') return false;
  return Object.values(skills as Record<string, unknown>).some(v => clampLevel(v) > 0);
}

/**
 * The app-wide numbers from every team document plus the two game counts (which come
 * from count queries, so the games themselves are never downloaded). Coaches are
 * everyone on at least one team, counted once however many teams they're on.
 */
export function computeAdminStats(
  teams: RawTeam[],
  games: { total: number; completed: number },
): AdminStats {
  const coaches = new Set<string>();
  let players = 0;
  let ratedPlayers = 0;

  teams.forEach(t => {
    if (Array.isArray(t.memberUids)) {
      t.memberUids.forEach(uid => { if (typeof uid === 'string' && uid) coaches.add(uid); });
    }
    if (Array.isArray(t.players)) {
      players += t.players.length;
      ratedPlayers += t.players.filter(isRated).length;
    }
  });

  return {
    coaches: coaches.size,
    teams: teams.length,
    games: games.total,
    completedGames: games.completed,
    players,
    ratedPlayers,
  };
}

/** "73%", or "–" when there are no players to rate. */
export function ratedPercent(stats: Pick<AdminStats, 'players' | 'ratedPlayers'>): string {
  if (!stats.players) return '–';
  return `${Math.round((stats.ratedPlayers / stats.players) * 100)}%`;
}
