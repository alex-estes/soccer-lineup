import { shuffleArr } from './utils';

/**
 * Who plays and who sits in one rotation, before positions are assigned.
 * `field` holds only players the generator may move; `locked` players are on the field
 * too but fixed. A played rotation is frozen entirely.
 */
export interface RotationPlan {
  played: boolean;
  locked: Set<string>;
  field: Set<string>;
  bench: Set<string>;
}

/** Options for finishStrong beyond the single strength number. */
export interface ArrangeOptions {
  /**
   * Stack the final rotation first (the "strong finish" setting). Off, every unplayed
   * rotation is simply evened out. Default on.
   */
  stackFinish?: boolean;
  /** More per-player values whose rotation totals are evened out alongside strength. */
  balance?: ((name: string) => number)[];
  /**
   * How many floor rules a rotation's on-floor group breaks (see repairFloorRules).
   * No trade is ever allowed to raise the count summed over the two rotations it touches.
   */
  violations?: (onFloor: string[]) => number;
}

const onFloor = (p: RotationPlan) => [...p.field, ...p.locked];

/**
 * Fixes floor-rule breaches (basketball: no ball handler, too many Bronze) by paired
 * trades, the same kind finishStrong makes: player X sits a rotation instead of another
 * while Y does the reverse, so nobody's number of rotations changes, and nobody gets
 * more back-to-back benchings. Each accepted trade strictly lowers the game's total
 * breaches, so this terminates. Breaches no legal trade can fix are left standing.
 *
 * Mutates `plans` in place.
 */
export function repairFloorRules(
  plans: RotationPlan[],
  violations: (onFloor: string[]) => number,
  /** A rotation to leave untouched (the stacked finish). */
  keep = -1,
): void {
  const open = plans.map((p, i) => (p.played || i === keep ? -1 : i)).filter(i => i >= 0);
  const v = plans.map(p => violations(onFloor(p)));

  for (let guard = 0; guard < 500; guard++) {
    let best: { a: number; b: number; x: string; y: string; gain: number } | null = null;
    for (const a of shuffleArr(open)) {
      if (v[a] === 0) continue;
      for (const b of shuffleArr(open)) {
        if (b === a) continue;
        // x: sits a, plays b → comes on in a.  y: plays a, sits b → goes off in a.
        for (const x of shuffleArr([...plans[a].bench])) {
          if (!plans[b].field.has(x)) continue;
          for (const y of shuffleArr([...plans[a].field])) {
            if (!plans[b].bench.has(y)) continue;
            trade(plans, a, b, x, y);
            const gain = v[a] + v[b] - violations(onFloor(plans[a])) - violations(onFloor(plans[b]));
            trade(plans, a, b, y, x);
            if (gain <= 0 || (best && gain <= best.gain)) continue;
            if (!tradeKeepsRestPattern(plans, a, b, x, y)) continue;
            best = { a, b, x, y, gain };
          }
        }
      }
    }
    if (!best) break;
    trade(plans, best.a, best.b, best.x, best.y);
    v[best.a] = violations(onFloor(plans[best.a]));
    v[best.b] = violations(onFloor(plans[best.b]));
  }
}

/** Total floor-rule breaches across a plan (0 with no rules). */
export function planViolations(plans: RotationPlan[], violations?: (onFloor: string[]) => number): number {
  if (!violations) return 0;
  return plans.reduce((a, p) => a + violations(onFloor(p)), 0);
}

/**
 * "Finish strong": rearranges WHEN players sit — never how often — so the last rotation
 * fields the strongest group it can, then evens out talent across the earlier rotations.
 * With `stackFinish` off it only does the evening out, across every rotation.
 *
 * Every change is a paired trade between two unplayed rotations: player S sits rotation
 * A instead of B while player W sits B instead of A. Each player's number of rotations
 * played is therefore exactly what the playing-time pass gave them, so "everyone plays
 * the same" and "who gets the odd extra rotation" (random) are untouched by
 * construction. A trade is also refused if it would give either player more
 * back-to-back benchings than they already had, and locked players are never moved.
 *
 * With `balance` values given, the evening out works on all of them at once (basketball:
 * strength, offense and defense), and with `violations` no trade may add a floor-rule
 * breach.
 *
 * Mutates `plans` in place.
 */
export function finishStrong(
  plans: RotationPlan[],
  strength: (name: string) => number,
  { stackFinish = true, balance = [], violations }: ArrangeOptions = {},
): void {
  // Would trade(a, b, s, w) add floor-rule breaches across the two rotations?
  const breaches = (a: number, b: number, s: string, w: string): boolean => {
    if (!violations) return false;
    const before = violations(onFloor(plans[a])) + violations(onFloor(plans[b]));
    trade(plans, a, b, s, w);
    const after = violations(onFloor(plans[a])) + violations(onFloor(plans[b]));
    trade(plans, a, b, w, s);
    return after > before;
  };

  if (!stackFinish) {
    if (violations) repairFloorRules(plans, violations);
    evenOut(plans, plans.length, Infinity, [strength, ...balance], breaches);
    return;
  }
  const last = plans.length - 1;
  if (last < 1 || plans[last].played) return;

  const rotStrength = (p: RotationPlan) => {
    let s = 0;
    p.field.forEach(n => { s += strength(n); });
    p.locked.forEach(n => { s += strength(n); });
    return s;
  };

  // Loops below iterate over array copies, never the Sets themselves: the legality check
  // applies and undoes a trade, and a Set entry deleted and re-added mid-iteration is
  // visited again — forever.

  // Rotations we may trade between: unplayed, and not the final one for phase 2.
  const open = plans.map((p, i) => (p.played ? -1 : i)).filter(i => i >= 0);

  // ── Phase 1: stack the final rotation. Each accepted trade strictly raises its total
  // strength, so this terminates.
  for (let guard = 0; guard < 500; guard++) {
    let best: { r: number; s: string; w: string; gain: number } | null = null;
    for (const r of shuffleArr(open)) {
      if (r === last) continue;
      // s: sits in the final rotation, plays r.  w: plays the final rotation, sits r.
      for (const s of shuffleArr([...plans[last].bench])) {
        if (!plans[r].field.has(s)) continue;
        for (const w of [...plans[last].field]) {
          if (!plans[r].bench.has(w)) continue;
          const gain = strength(s) - strength(w);
          if (gain <= 0 || (best && gain <= best.gain)) continue;
          if (!tradeKeepsRestPattern(plans, last, r, s, w)) continue;
          best = { r, s, w, gain };
        }
      }
    }
    if (!best) break;
    trade(plans, last, best.r, best.s, best.w);
  }

  // ── Phase 1b: if an earlier rotation still came out stronger than the last, swap the
  // two rotations' groups outright — everyone's count is unchanged. Skipped when either
  // has locked players (they belong to their slot's rotation) or it would add a
  // back-to-back benching.
  for (let guard = 0; guard < plans.length; guard++) {
    const lastSum = rotStrength(plans[last]);
    let bestR = -1;
    let bestSum = lastSum;
    for (const r of open) {
      if (r === last || plans[r].locked.size || plans[last].locked.size) continue;
      const sum = rotStrength(plans[r]);
      if (sum <= bestSum) continue;
      if (!swapKeepsRestPattern(plans, r, last)) continue;
      bestR = r;
      bestSum = sum;
    }
    if (bestR === -1) break;
    swapWhole(plans, bestR, last);
  }

  // ── Floor rules. Stacking the finish may have crowded weak players into an earlier
  // rotation; fix that among the earlier rotations first, so the finish survives, and
  // only touch the finish if nothing else works — the rules come before the finish.
  if (violations) {
    repairFloorRules(plans, violations, last);
    repairFloorRules(plans, violations);
  }

  // ── Phase 2: even out the earlier rotations, never lifting one above the finish.
  evenOut(plans, last, rotStrength(plans[last]), [strength, ...balance], breaches);
}

/**
 * Minimises the spread (sum of squared differences from the mean) of rotation totals
 * across plans[0 .. end) — played ones included as fixed points, so later rotations make
 * up for an unlucky start — summed over every value in `dims`. `dims[0]` is strength:
 * no rotation's strength may pass `ceiling`. Each accepted trade strictly lowers the
 * objective, so this terminates.
 */
function evenOut(
  plans: RotationPlan[],
  end: number,
  ceiling: number,
  dims: ((name: string) => number)[],
  breaches: (a: number, b: number, s: string, w: string) => boolean,
): void {
  const early = plans.slice(0, end);
  if (early.length < 2) return;
  const open = early.map((p, i) => (p.played ? -1 : i)).filter(i => i >= 0);
  const total = (p: RotationPlan, f: (n: string) => number) => onFloor(p).reduce((a, n) => a + f(n), 0);
  const sums = dims.map(f => early.map(p => total(p, f)));
  const EPS = 1e-9;

  for (let guard = 0; guard < 500; guard++) {
    let best: { a: number; b: number; s: string; w: string; delta: number } | null = null;
    for (const a of open) {
      for (const b of open) {
        if (b <= a) continue;
        // s sits a (instead of b); w sits b (instead of a).
        for (const s of [...plans[a].field]) {
          if (!plans[b].bench.has(s)) continue;
          for (const w of [...plans[a].bench]) {
            if (!plans[b].field.has(w)) continue;
            // The mean is unchanged by a trade, so comparing raw squares is enough.
            let delta = 0;
            dims.forEach((f, k) => {
              const d = f(w) - f(s); // change to a's total; b moves by -d
              delta += (sums[k][a] + d) ** 2 + (sums[k][b] - d) ** 2 - sums[k][a] ** 2 - sums[k][b] ** 2;
            });
            if (delta >= -EPS || (best && delta >= best.delta)) continue;
            const d0 = dims[0](w) - dims[0](s);
            if (sums[0][a] + d0 > ceiling + EPS || sums[0][b] - d0 > ceiling + EPS) continue;
            if (!tradeKeepsRestPattern(plans, a, b, w, s)) continue;
            if (breaches(a, b, w, s)) continue;
            best = { a, b, s, w, delta };
          }
        }
      }
    }
    if (!best) break;
    const { a, b, s, w } = best;
    dims.forEach((f, k) => {
      const d = f(w) - f(s);
      sums[k][a] += d;
      sums[k][b] -= d;
    });
    trade(plans, a, b, w, s);
  }
}

/**
 * Before: `s` sits rotation a and plays b; `w` plays a and sits b.
 * After:  `s` plays a and sits b; `w` sits a and plays b.
 * Calling it again with s and w swapped undoes it.
 */
function trade(plans: RotationPlan[], a: number, b: number, s: string, w: string): void {
  plans[a].bench.delete(s); plans[a].field.add(s);
  plans[a].field.delete(w); plans[a].bench.add(w);
  plans[b].field.delete(s); plans[b].bench.add(s);
  plans[b].bench.delete(w); plans[b].field.add(w);
}

function swapWhole(plans: RotationPlan[], a: number, b: number): void {
  const { field, bench } = plans[a];
  plans[a].field = plans[b].field;
  plans[a].bench = plans[b].bench;
  plans[b].field = field;
  plans[b].bench = bench;
}

function swapKeepsRestPattern(plans: RotationPlan[], a: number, b: number): boolean {
  const names = new Set([...plans[a].bench, ...plans[b].bench]);
  const before = new Map([...names].map(n => [n, backToBack(plans, n)]));
  swapWhole(plans, a, b);
  const ok = [...names].every(n => backToBack(plans, n) <= before.get(n)!);
  swapWhole(plans, a, b);
  return ok;
}

/**
 * How good a finished plan is, for choosing between attempts: fewest floor-rule breaches
 * first, then the strongest finish (when stacking it), then the most even earlier
 * rotations across strength and every `balance` value. Compare lexicographically;
 * higher is better.
 */
export function scorePlan(
  plans: RotationPlan[],
  strength: (name: string) => number,
  { stackFinish = true, balance = [], violations }: ArrangeOptions = {},
): number[] {
  const sum = (p: RotationPlan, f: (n: string) => number) => onFloor(p).reduce((a, n) => a + f(n), 0);
  const end = stackFinish ? plans.length - 1 : plans.length;
  const variance = [strength, ...balance].reduce((acc, f) => {
    const sums = plans.slice(0, end).map(p => sum(p, f));
    const mean = sums.reduce((a, b) => a + b, 0) / Math.max(1, sums.length);
    return acc + sums.reduce((a, b) => a + (b - mean) ** 2, 0);
  }, 0);
  const finish = stackFinish ? sum(plans[plans.length - 1], strength) : 0;
  return [-planViolations(plans, violations), finish, -variance];
}

/** Lexicographic "a beats b" for scorePlan results. */
export function betterScore(a: number[], b: number[]): boolean {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}

function backToBack(plans: RotationPlan[], name: string): number {
  let n = 0;
  for (let i = 1; i < plans.length; i++) {
    if (plans[i].bench.has(name) && plans[i - 1].bench.has(name)) n++;
  }
  return n;
}

/** Would trade(a, b, s, w) leave either player with more back-to-back benchings? */
function tradeKeepsRestPattern(plans: RotationPlan[], a: number, b: number, s: string, w: string): boolean {
  const before = [backToBack(plans, s), backToBack(plans, w)];
  trade(plans, a, b, s, w);
  const ok = backToBack(plans, s) <= before[0] && backToBack(plans, w) <= before[1];
  trade(plans, a, b, w, s); // undo: the same trade with roles swapped restores it
  return ok;
}
