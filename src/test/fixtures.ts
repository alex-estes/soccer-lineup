import { emptyRotations, namesOnField } from '../lib/utils';
import { normalizeSkills } from '../lib/skills';
import { SPORTS } from '../constants';
import { makeInitialState } from '../state/reducer';
import type { AppState, Player, PositionDef, PositionId, Rotation, SportId, TeamMeta } from '../types';

/**
 * mulberry32 — a tiny seeded PRNG. The generator leans on Math.random for shuffling, so
 * tests stub it with this: a failure is then reproducible from the seed rather than
 * being a coin flip in CI.
 */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** defense / offense levels keyed by player name; anything omitted is unrated (0). */
export type Ratings = Record<string, number>;

export const NAMES = ['Alex', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jamie', 'Henry', 'Lucy', 'Jordan'];

/** Soccer lines with the original def / mid / fwd ids and skills. */
export function soccerLineup(def: number, mid: number, fwd: number): PositionDef[] {
  const [d, m, f] = SPORTS.soccer.defaultSettings.positions;
  return [{ ...d, count: def }, { ...m, count: mid }, { ...f, count: fwd }];
}

export const F222 = soccerLineup(2, 2, 2);
export const F311 = soccerLineup(3, 1, 1);
/** Basketball's default: Guards 2 / Forwards 2 / Center 1, all rated by "overall". */
export const HOOPS = SPORTS.basketball.defaultSettings.positions;

export function mkTeam(sport: SportId = 'soccer'): TeamMeta {
  return {
    id: 'test-team', name: 'Test FC', sport, ownerUid: 'owner',
    memberUids: ['owner'], memberNames: { owner: 'Coach' }, joinCode: 'ABCDEFGH',
  };
}

/** A spread of ratings with exactly two players weak on defense. */
export const TWO_WEAK_DEFENDERS: Ratings = {
  Alex: 1, Taylor: 1, Morgan: 3, Casey: 2, Riley: 2, Jamie: 3, Henry: 2, Lucy: 2, Jordan: 3,
};

export function mkPlayers(names: string[] = NAMES, defense: Ratings = {}, offense: Ratings = {}): Player[] {
  return names.map(name => ({
    name,
    active: true,
    skills: normalizeSkills({ defense: defense[name] ?? 0, offense: offense[name] ?? 0 }, 'soccer'),
  }));
}

/** Basketball players with a single overall rating. */
export function mkHoopsPlayers(names: string[] = NAMES, overall: Ratings = {}): Player[] {
  return names.map(name => ({
    name,
    active: true,
    skills: normalizeSkills({ overall: overall[name] ?? 0 }, 'basketball'),
  }));
}

export function mkState(
  players: Player[],
  positions: PositionDef[] = F222,
  useSkillRatings = true,
  { sport = 'soccer', rotations = 6 }: { sport?: SportId; rotations?: number } = {},
): AppState {
  const id = 'test-game';
  const settings = { positions, rotationCount: rotations, useSkillRatings };
  return {
    ...makeInitialState(mkTeam(sport), players, settings),
    games: [{
      id,
      name: 'Opponent',
      rotations: emptyRotations(positions, rotations),
      positions,
      scores: {},
      opponentScore: 0,
      completed: false,
      excludedPlayers: [],
      createdAt: 1,
    }],
    curGame: id,
    isLoaded: true,
  };
}

/** Players standing in one line who are rated C at the given levels map. */
export function weakCountIn(rot: Rotation, pos: PositionId, levels: Ratings): number {
  return rot.slots[pos].filter(n => n !== null && levels[n] === 1).length;
}

export function fieldNames(rot: Rotation): string[] {
  return namesOnField(rot);
}

export function playingTimeSpread(rots: Rotation[], names: string[]): number {
  const totals: Record<string, number> = {};
  names.forEach(n => { totals[n] = 0; });
  rots.forEach(r => fieldNames(r).forEach(n => { totals[n]++; }));
  const values = Object.values(totals);
  return Math.max(...values) - Math.min(...values);
}

/** Longest run of consecutive rotations any single player spent on the bench. */
export function longestBenchRun(rots: Rotation[]): number {
  const run: Record<string, number> = {};
  let worst = 0;
  rots.forEach(r => {
    const benched = new Set(r.bench);
    new Set([...Object.keys(run), ...benched]).forEach(n => {
      run[n] = benched.has(n) ? (run[n] ?? 0) + 1 : 0;
      if (run[n] > worst) worst = run[n];
    });
  });
  return worst;
}
