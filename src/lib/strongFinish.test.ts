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

  it('gets basketball\'s finish to the best group the floor rules allow almost every time', () => {
    // With three Bronze, a Bronze-free finish is impossible without breaking a rule: no
    // one sits twice running, so all three would play the rotation before it — three
    // Bronze on the floor at once. The rules come first, so the best is one Bronze.
    let perfect = 0;
    for (let i = 0; i < RUNS; i++) {
      if (strength(autoGenerate(hoops(true))[7], TIERS) === best(TIERS, 5) - 1) perfect++;
    }
    expect(perfect / RUNS).toBeGreaterThan(0.85);
  });

  it('gets basketball\'s finish to the best possible group when the rules leave room', () => {
    const twoBronze: Ratings = { ...TIERS, Jordan: 2 };
    let perfect = 0;
    for (let i = 0; i < RUNS; i++) {
      if (strength(autoGenerate(hoops(true, twoBronze))[7], twoBronze) === best(twoBronze, 5)) perfect++;
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

describe('basketball floor rules', SLOW, () => {
  const bronzeOnFloor = (r: Rotation, overall: Ratings) => fieldNames(r).filter(n => overall[n] === 1).length;

  it.each([true, false])('never puts more than two Bronze on the floor (strong finish %s)', sf => {
    let worst = 0;
    for (let i = 0; i < RUNS; i++) {
      autoGenerate(hoops(sf)).forEach(r => { worst = Math.max(worst, bronzeOnFloor(r, TIERS)); });
    }
    expect(worst).toBe(2);
  });

  it('caps Bronze where the old generator did not', () => {
    // Ratings off: no rules, so 3+ Bronze turn up regularly — the cap is what prevents it.
    const state = mkState(mkHoopsPlayers(NAMES, TIERS), HOOPS, false, { sport: 'basketball', rotations: 8 });
    let over = 0;
    for (let i = 0; i < RUNS; i++) autoGenerate(state).forEach(r => { if (bronzeOnFloor(r, TIERS) > 2) over++; });
    expect(over).toBeGreaterThan(0);
  });

  it.each([true, false])('always has a ball handler on the floor (strong finish %s)', sf => {
    // Only three players are Silver or better on offense; everyone else is Bronze there.
    const offense: Ratings = Object.fromEntries(NAMES.map(n => [n, 1]));
    offense.Henry = 3; offense.Casey = 2; offense.Morgan = 2;
    let missing = 0;
    for (let i = 0; i < RUNS; i++) {
      const state = mkState(mkHoopsPlayers(NAMES, TIERS, offense), HOOPS, true, { sport: 'basketball', rotations: 8, strongFinish: sf });
      const rots = autoGenerate(state);
      expect(playingTimeSpread(rots, NAMES)).toBe(1);
      expect(longestBenchRun(rots)).toBe(1);
      rots.forEach(r => { if (!fieldNames(r).some(n => offense[n] >= 2)) missing++; });
    }
    expect(missing).toBe(0);
  });

  it('counts unrated offense as able to bring the ball up', () => {
    // Nobody rated on offense at all: the rule must not starve anyone of trades.
    for (let i = 0; i < 50; i++) {
      const rots = autoGenerate(hoops(true));
      expect(playingTimeSpread(rots, NAMES)).toBe(1);
    }
  });

  it('evens out offense and defense across rotations, not just overall', () => {
    // Everyone Silver overall, so overall gives no signal; offense and defense split
    // the roster into scorers and stoppers.
    const overall: Ratings = Object.fromEntries(NAMES.map(n => [n, 2]));
    const offense: Ratings = { Alex: 3, Taylor: 3, Morgan: 3, Casey: 3, Riley: 1, Jamie: 1, Henry: 1, Lucy: 1, Jordan: 2 };
    const defense: Ratings = Object.fromEntries(NAMES.map(n => [n, 4 - offense[n]]));
    const spread = (useSkills: boolean) => {
      vi.spyOn(Math, 'random').mockImplementation(seededRandom(20261105));
      const state = mkState(mkHoopsPlayers(NAMES, overall, offense, defense), HOOPS, useSkills, { sport: 'basketball', rotations: 8 });
      let total = 0;
      for (let i = 0; i < RUNS; i++) {
        const sums = autoGenerate(state).map(r => fieldNames(r).reduce((a, n) => a + offense[n], 0));
        total += Math.max(...sums) - Math.min(...sums);
      }
      return total / RUNS;
    };
    expect(spread(true)).toBeLessThan(spread(false) - 1);
  });

  it('stacks the finish by Overall when it is rated, not by offense and defense', () => {
    // Offense and defense run opposite to overall, so averaging them would put the
    // Bronze-overall players in the finish.
    const inverse: Ratings = Object.fromEntries(NAMES.map(n => [n, 4 - TIERS[n]]));
    let total = 0;
    for (let i = 0; i < RUNS; i++) {
      const state = mkState(mkHoopsPlayers(NAMES, TIERS, inverse, inverse), HOOPS, true, { sport: 'basketball', rotations: 8, strongFinish: true });
      total += strength(autoGenerate(state)[7], TIERS);
    }
    // The best the floor rules allow here is 12 (see above); an average-of-skills
    // finish would land well under the overall average of 10.
    expect(total / RUNS).toBeGreaterThan(11.5);
  });
});
