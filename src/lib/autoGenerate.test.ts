import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { autoGenerate } from './autoGenerate';
import { POSITIONS } from '../constants';
import {
  F222, F311, NAMES, TWO_WEAK_DEFENDERS,
  fieldNames, longestBenchRun, mkPlayers, mkState, playingTimeSpread, seededRandom, weakCountIn,
} from '../test/fixtures';
import type { Ratings } from '../test/fixtures';

// Enough runs to be convincing without slowing the suite down: 6 rotations each.
const RUNS = 400;

beforeEach(() => {
  // Reseeded per test, so each test is deterministic regardless of run order.
  vi.spyOn(Math, 'random').mockImplementation(seededRandom(20260911));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('weak-player cap', () => {
  it('never puts two C-rated defenders on defense together', () => {
    let violations = 0;
    for (let i = 0; i < RUNS; i++) {
      const rots = autoGenerate(mkState(mkPlayers(NAMES, TWO_WEAK_DEFENDERS)));
      rots.forEach(r => { if (weakCountIn(r, 'def', TWO_WEAK_DEFENDERS) > 1) violations++; });
    }
    expect(violations).toBe(0);
  });

  it('does pair them when the setting is off — proving the rule is what prevents it', () => {
    let violations = 0;
    for (let i = 0; i < RUNS; i++) {
      const rots = autoGenerate(mkState(mkPlayers(NAMES, TWO_WEAK_DEFENDERS), F222, false));
      rots.forEach(r => { if (weakCountIn(r, 'def', TWO_WEAK_DEFENDERS) > 1) violations++; });
    }
    expect(violations).toBeGreaterThan(0);
  });

  it('holds at a 3-defender formation, where cap(3) is still 1', () => {
    let violations = 0;
    for (let i = 0; i < RUNS; i++) {
      const rots = autoGenerate(mkState(mkPlayers(NAMES, TWO_WEAK_DEFENDERS), F311));
      rots.forEach(r => { if (weakCountIn(r, 'def', TWO_WEAK_DEFENDERS) > 1) violations++; });
    }
    expect(violations).toBe(0);
  });

  it('still allows a lone weak forward — cap(1) is 1, not 0', () => {
    const allWeakOffense = Object.fromEntries(NAMES.map(n => [n, 1]));
    let unfilledForwards = 0;
    for (let i = 0; i < 100; i++) {
      const rots = autoGenerate(mkState(mkPlayers(NAMES, {}, allWeakOffense), F311));
      rots.forEach(r => { if (r.fwd.some(n => !n)) unfilledForwards++; });
    }
    expect(unfilledForwards).toBe(0);
  });

  it('applies to the midfield line via the Offense rating', () => {
    let violations = 0;
    for (let i = 0; i < RUNS; i++) {
      const rots = autoGenerate(mkState(mkPlayers(NAMES, {}, TWO_WEAK_DEFENDERS)));
      rots.forEach(r => { if (weakCountIn(r, 'mid', TWO_WEAK_DEFENDERS) > 1) violations++; });
    }
    expect(violations).toBe(0);
  });

  it('still protects defense when every other line is already over its own cap', () => {
    // Everyone is weak on offense, so midfield and attack are hopeless no matter what.
    // The repair pass must still be willing to trade a competent defender out of them —
    // refusing because the donor line is already over cap would strand two C defenders.
    const offense = Object.fromEntries(NAMES.map(n => [n, 1]));
    let violations = 0;
    for (let i = 0; i < RUNS; i++) {
      const rots = autoGenerate(mkState(mkPlayers(NAMES, TWO_WEAK_DEFENDERS, offense)));
      rots.forEach(r => { if (weakCountIn(r, 'def', TWO_WEAK_DEFENDERS) > 1) violations++; });
    }
    expect(violations).toBe(0);
  });

  it('is soft: an all-weak roster still fills every slot instead of hanging', () => {
    const allWeak = Object.fromEntries(NAMES.map(n => [n, 1]));
    let unfilled = 0;
    for (let i = 0; i < 100; i++) {
      const rots = autoGenerate(mkState(mkPlayers(NAMES, allWeak)));
      rots.forEach(r => POSITIONS.forEach(pos => r[pos].forEach(n => { if (!n) unfilled++; })));
    }
    expect(unfilled).toBe(0);
  });
});

describe('the skill layer does not weaken the existing rules', () => {
  it.each([true, false])('keeps playing time even and avoids back-to-back bench (useSkillRatings=%s)', on => {
    let worstSpread = 0;
    let worstBenchRun = 0;
    for (let i = 0; i < RUNS; i++) {
      const rots = autoGenerate(mkState(mkPlayers(NAMES, TWO_WEAK_DEFENDERS), F222, on));
      worstSpread = Math.max(worstSpread, playingTimeSpread(rots, NAMES));
      worstBenchRun = Math.max(worstBenchRun, longestBenchRun(rots));
    }
    // 9 players over 6 rotations of 6 slots divides exactly, so the spread should be 0.
    expect(worstSpread).toBe(0);
    expect(worstBenchRun).toBe(1);
  });

  it('never duplicates or drops a player, even when the repair pass swaps slots', () => {
    // Four of nine are weak on defense, so the repair pass gets plenty of work.
    const defense: Ratings = { Alex: 1, Taylor: 1, Morgan: 1, Casey: 2, Riley: 2, Jamie: 3, Henry: 2, Lucy: 1, Jordan: 3 };
    const offense: Ratings = { Alex: 1, Taylor: 2, Morgan: 1, Casey: 1, Riley: 3, Jamie: 2, Henry: 1, Lucy: 2, Jordan: 2 };
    for (let i = 0; i < RUNS; i++) {
      const rots = autoGenerate(mkState(mkPlayers(NAMES, defense, offense)));
      rots.forEach(r => {
        const everyone = [...fieldNames(r), ...r.bench];
        expect(new Set(everyone).size).toBe(everyone.length);
        expect([...everyone].sort()).toEqual([...NAMES].sort());
      });
    }
  });
});

describe('locked slots', () => {
  it('leaves the other defensive slot non-weak when a C is locked in', () => {
    let pairedWithWeak = 0;
    for (let i = 0; i < RUNS; i++) {
      const state = mkState(mkPlayers(NAMES, TWO_WEAK_DEFENDERS));
      state.games[0].rotations.forEach(r => { r.def[0] = 'Alex'; r.locked.def[0] = true; });
      const rots = autoGenerate(state);
      rots.forEach(r => {
        expect(r.def[0]).toBe('Alex');
        if (r.def[1] && TWO_WEAK_DEFENDERS[r.def[1]] === 1) pairedWithWeak++;
      });
    }
    expect(pairedWithWeak).toBe(0);
  });

  it('respects locks it cannot satisfy rather than fighting them', () => {
    const state = mkState(mkPlayers(NAMES, TWO_WEAK_DEFENDERS));
    state.games[0].rotations.forEach(r => {
      r.def[0] = 'Alex'; r.locked.def[0] = true;
      r.def[1] = 'Taylor'; r.locked.def[1] = true;
    });
    const rots = autoGenerate(state);
    rots.forEach(r => {
      expect(r.def[0]).toBe('Alex');
      expect(r.def[1]).toBe('Taylor');
    });
  });

  it('tolerates a locked slot holding a name that is on no roster', () => {
    const state = mkState(mkPlayers(NAMES, TWO_WEAK_DEFENDERS));
    state.games[0].rotations.forEach(r => { r.def[0] = 'Ghost'; r.locked.def[0] = true; });
    const rots = autoGenerate(state);
    expect(rots).toHaveLength(6);
    rots.forEach(r => expect(r.def[0]).toBe('Ghost'));
  });
});

describe('talent-aware tiebreak', () => {
  it('clusters the strongest players together less often, with no cap in play', () => {
    // All A or B, so the weak cap never binds — any improvement is the tiebreak alone.
    const defense: Ratings = { Alex: 3, Taylor: 3, Morgan: 3, Casey: 3, Riley: 2, Jamie: 2, Henry: 2, Lucy: 2, Jordan: 2 };
    const rateOfAllStrongDefense = (on: boolean) => {
      let both = 0;
      let total = 0;
      for (let i = 0; i < RUNS; i++) {
        const rots = autoGenerate(mkState(mkPlayers(NAMES, defense), F222, on));
        rots.forEach(r => {
          total++;
          if (r.def.every(n => n !== null && defense[n] === 3)) both++;
        });
      }
      return both / total;
    };

    const off = rateOfAllStrongDefense(false);
    vi.spyOn(Math, 'random').mockImplementation(seededRandom(20260911));
    const on = rateOfAllStrongDefense(true);

    expect(on).toBeLessThan(off * 0.8);
  });
});
