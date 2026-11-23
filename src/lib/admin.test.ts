import { describe, expect, it } from 'vitest';
import type { User } from 'firebase/auth';
import { ADMIN_UID, computeAdminStats, isAdmin, ratedPercent } from './admin';

const NO_GAMES = { total: 0, completed: 0 };

describe('computeAdminStats', () => {
  it('counts a coach on several teams once', () => {
    const s = computeAdminStats([
      { memberUids: ['a', 'b'], players: [] },
      { memberUids: ['b', 'c'], players: [] },
    ], NO_GAMES);
    expect(s.coaches).toBe(3);
    expect(s.teams).toBe(2);
  });

  it('counts a player as rated once any one rating is set', () => {
    const s = computeAdminStats([{
      memberUids: ['a'],
      players: [
        { name: 'Jo', skills: { overall: 2, offense: 0, defense: 0 } },
        { name: 'Sam', skills: { defense: 0, offense: 0, teamwork: 1, kindness: 0 } },
        { name: 'Ali', skills: { overall: 0, offense: 0, defense: 0 } },
        { name: 'Kim' },
      ],
    }], NO_GAMES);
    expect(s.players).toBe(4);
    expect(s.ratedPlayers).toBe(2);
  });

  it('passes the game counts through', () => {
    const s = computeAdminStats([], { total: 12, completed: 7 });
    expect(s.games).toBe(12);
    expect(s.completedGames).toBe(7);
  });

  it('tolerates malformed team documents instead of failing the whole page', () => {
    const s = computeAdminStats([
      {},
      { memberUids: 'nope', players: 'nope' },
      { memberUids: [null, '', 'a'], players: [null, 7, { skills: { overall: 'x' } }] },
    ], NO_GAMES);
    expect(s).toEqual({ coaches: 1, teams: 3, games: 0, completedGames: 0, players: 3, ratedPlayers: 0 });
  });
});

describe('ratedPercent', () => {
  it('rounds to a whole percent', () => {
    expect(ratedPercent({ players: 3, ratedPlayers: 2 })).toBe('67%');
  });

  it('shows a dash rather than NaN% with no players', () => {
    expect(ratedPercent({ players: 0, ratedPlayers: 0 })).toBe('–');
  });
});

describe('isAdmin', () => {
  it('is true only for the owner account', () => {
    expect(isAdmin({ uid: ADMIN_UID } as User)).toBe(true);
    expect(isAdmin({ uid: 'someone-else' } as User)).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });
});
