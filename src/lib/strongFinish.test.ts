import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { autoGenerate } from './autoGenerate';
import {
  HOOPS, NAMES, F222, fieldNames, longestBenchRun, mkHoopsPlayers, mkPlayers, mkState,
  playingTimeSpread, seededRandom, type Ratings,
} from '../test/fixtures';
import type { AppState, Rotation } from '../types';

// Each generate tries up to 24 schedules, so these runs are heavier than the others.
const RUNS = 200;
const SLOW = { timeout: 30_000 };

beforeEach(() => {
  vi.spyOn(Math, 'random').mockImplementation(seededRandom(20261105));
});
afterEach(() => { vi.restoreAllMocks(); });

// Three A's, three B's, three C's — both skills alike, so "strength" is unambiguous.
const TIERS: Ratings = { Alex: 3, Taylor: 3, Morgan: 3, Casey: 2, Riley: 2, Jamie: 2, Henry: 1, Lucy: 1, Jordan: 1 };

function soccer(strongFinish: boolean, ratings: Ratings = TIERS): AppState {
  return mkState(mkPlayers(NAMES, ratings, ratings), F222, true, { strongFinish });
}

function hoops(strongFinish: boolean, ratings: Ratings = TIERS): AppState {
  return mkState(mkHoopsPlayers(NAMES, ratings), HOOPS, true, { sport: 'basketball', rotations: 8, strongFinish });
}

const strength = (r: Rotation, ratings: Ratings) => fieldNames(r).reduce((a, n) => a + (ratings[n] ?? 2), 0);
const best = (ratings: Ratings, k: number) =>
  Object.values(ratings).sort((a, b) => b - a).slice(0, k).reduce((a, b) => a + b, 0);

describe('strongest lineup in the last rotation', SLOW, () => {
  it('fields the strongest possible group last (soccer, 6 of 9)', () => {
    let perfect = 0;
    for (let i = 0; i < RUNS; i++) {
      const rots = autoGenerate(soccer(true));
      if (strength(rots[5], TIERS) === best(TIERS, 6)) perfect++;
    }
    expect(perfect / RUNS).toBe(1);
  });

  it('the last rotation is never weaker than any earlier one', () => {
    for (let i = 0; i < RUNS; i++) {
      const rots = autoGenerate(hoops(true));
      const last = strength(rots[7], TIERS);
      rots.slice(0, 7).forEach(r => expect(last).toBeGreaterThanOrEqual(strength(r, TIERS)));
    }
  });

  it('is what makes the difference — without it the finish is no stronger than average', () => {
    let on = 0, off = 0;
    for (let i = 0; i < RUNS; i++) on += strength(autoGenerate(soccer(true))[5], TIERS);
    vi.spyOn(Math, 'random').mockImplementation(seededRandom(20261105));
    for (let i = 0; i < RUNS; i++) off += strength(autoGenerate(soccer(false))[5], TIERS);
    expect(on / RUNS).toBeGreaterThan(off / RUNS + 1);
  });

  it.each(['soccer', 'basketball'] as const)('never changes playing time or adds back-to-back bench (%s)', sport => {
    for (let i = 0; i < RUNS; i++) {
      const rots = autoGenerate(sport === 'soccer' ? soccer(true) : hoops(true));
      // soccer: 36 spots / 9 = 4 each exactly; basketball: 40 / 9 → 4 or 5.
      expect(playingTimeSpread(rots, NAMES)).toBe(sport === 'soccer' ? 0 : 1);
      expect(longestBenchRun(rots)).toBe(1);
      rots.forEach(r => {
        const everyone = [...fieldNames(r), ...r.bench];
        expect([...everyone].sort()).toEqual([...NAMES].sort());
      });
    }
  });

  it('keeps who gets the extra rotation random, not skill-based', () => {
    // Basketball: 4 of 9 players get a 5th rotation. Over many runs the A's shouldn't
    // get it more often than the C's.
    const extra: Record<string, number> = {};
    for (let i = 0; i < RUNS; i++) {
      const rots = autoGenerate(hoops(true));
      const played: Record<string, number> = {};
      rots.forEach(r => fieldNames(r).forEach(n => { played[n] = (played[n] ?? 0) + 1; }));
      Object.entries(played).forEach(([n, c]) => { if (c === 5) extra[n] = (extra[n] ?? 0) + 1; });
    }
    const tier = (lvl: number) => NAMES.filter(n => TIERS[n] === lvl).reduce((a, n) => a + (extra[n] ?? 0), 0);
    const [a, c] = [tier(3), tier(1)];
    expect(Math.abs(a - c) / Math.max(a, c)).toBeLessThan(0.25);
  });

  it('evens out talent across the earlier rotations', () => {
    const spread = (make: (sf: boolean) => AppState, sf: boolean) => {
      vi.spyOn(Math, 'random').mockImplementation(seededRandom(20261105));
      let total = 0;
      for (let i = 0; i < RUNS; i++) {
        const rots = autoGenerate(make(sf));
        const sums = rots.slice(0, -1).map(r => strength(r, TIERS));
        total += Math.max(...sums) - Math.min(...sums);
      }
      return total / RUNS;
    };
    // Soccer 6 of 9: earlier rotations within about one grade point of each other
    // (≈3 with the setting off).
    expect(spread(soccer, true)).toBeLessThan(1.3);
    // Basketball 5 of 9 with no back-to-back sits leaves almost no freedom in when
    // anyone sits, so the honest promise there is only "no less even than without it".
    expect(spread(hoops, true)).toBeLessThanOrEqual(spread(hoops, false));
  });

  it('gets basketball\'s finish to the best possible group almost every time', () => {
    let perfect = 0;
    for (let i = 0; i < RUNS; i++) {
      if (strength(autoGenerate(hoops(true))[7], TIERS) === best(TIERS, 5)) perfect++;
    }
    expect(perfect / RUNS).toBeGreaterThan(0.85);
  });

  it('leaves a played last rotation alone', () => {
    const state = soccer(true);
    const last = state.games[0].rotations[5];
    last.slots = { def: ['Henry', 'Lucy'], mid: ['Jordan', 'Casey'], fwd: ['Riley', 'Jamie'] };
    last.bench = ['Alex', 'Taylor', 'Morgan'];
    last.played = true;
    const rots = autoGenerate(state);
    expect(rots[5]).toEqual(last);
  });

  it('never moves a locked player out of the last rotation', () => {
    for (let i = 0; i < 100; i++) {
      const state = soccer(true);
      state.games[0].rotations[5].slots.def[0] = 'Henry';
      state.games[0].rotations[5].locked.def[0] = true;
      const rots = autoGenerate(state);
      expect(rots[5].slots.def[0]).toBe('Henry');
    }
  });

  it('does nothing when skill ratings are off', () => {
    const state = mkState(mkPlayers(NAMES, TIERS, TIERS), F222, false, { strongFinish: true });
    let total = 0;
    for (let i = 0; i < RUNS; i++) total += strength(autoGenerate(state)[5], TIERS);
    // Average of a random 6 from 3/3/3 of A/B/C is 12; the best is 15.
    expect(total / RUNS).toBeLessThan(13);
  });
});
