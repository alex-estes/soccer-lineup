import { emptyRotations } from '../lib/utils';
import { normalizeSkills } from '../lib/skills';
import { POSITIONS } from '../constants';
import { initialState } from '../state/reducer';
import type { AppState, FormationSettings, Player, Position, Rotation } from '../types';

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

export const F222: FormationSettings = { playersOnField: 6, defenders: 2, midfielders: 2, forwards: 2 };
export const F311: FormationSettings = { playersOnField: 5, defenders: 3, midfielders: 1, forwards: 1 };

/** A spread of ratings with exactly two players weak on defense. */
export const TWO_WEAK_DEFENDERS: Ratings = {
  Alex: 1, Taylor: 1, Morgan: 3, Casey: 2, Riley: 2, Jamie: 3, Henry: 2, Lucy: 2, Jordan: 3,
};

export function mkPlayers(names: string[] = NAMES, defense: Ratings = {}, offense: Ratings = {}): Player[] {
  return names.map(name => ({
    name,
    active: true,
    skills: normalizeSkills({ defense: defense[name] ?? 0, offense: offense[name] ?? 0 }),
  }));
}

export function mkState(
  players: Player[],
  formation: FormationSettings = F222,
  useSkillRatings = true,
): AppState {
  const id = 'test-game';
  return {
    ...initialState,
    players,
    games: [{
      id,
      name: 'Opponent',
      rotations: emptyRotations(formation),
      opponentScore: 0,
      completed: false,
      excludedPlayers: [],
      formation,
    }],
    curGame: id,
    settings: { defaultFormation: formation, useSkillRatings },
    isLoaded: true,
  };
}

/** Players standing in one line who are rated C at the given levels map. */
export function weakCountIn(rot: Rotation, pos: Position, levels: Ratings): number {
  return rot[pos].filter(n => n !== null && levels[n] === 1).length;
}

export function fieldNames(rot: Rotation): string[] {
  const out: string[] = [];
  POSITIONS.forEach(pos => rot[pos].forEach(n => { if (n) out.push(n); }));
  return out;
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
