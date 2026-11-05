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

/**
 * "Finish strong": rearranges WHEN players sit — never how often — so the last rotation
 * fields the strongest group it can, then evens out talent across the earlier rotations.
 *
 * Every change is a paired trade between two unplayed rotations: player S sits rotation
 * A instead of B while player W sits B instead of A. Each player's number of rotations
 * played is therefore exactly what the playing-time pass gave them, so "everyone plays
 * the same" and "who gets the odd extra rotation" (random) are untouched by
 * construction. A trade is also refused if it would give either player more
 * back-to-back benchings than they already had, and locked players are never moved.
 *
 * Mutates `plans` in place.
 */
export function finishStrong(plans: RotationPlan[], strength: (name: string) => number): void {
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
  const finalSum = rotStrength(plans[last]);

  // ── Phase 2: even out the earlier rotations. Minimises the spread (sum of squared
  // differences from the mean) of rotation strength across every rotation except the
  // final one — played ones included as fixed points, so later rotations make up for an
  // unlucky start. Each accepted trade strictly lowers that sum, so this terminates.
  const early = plans.slice(0, last);
  if (early.length < 2) return;
  const sums = early.map(rotStrength);
  const EPS = 1e-9;

  for (let guard = 0; guard < 500; guard++) {
    let best: { a: number; b: number; s: string; w: string; delta: number } | null = null;
    for (const a of open) {
      if (a === last) continue;
      for (const b of open) {
        if (b === last || b <= a) continue;
        // s sits a (instead of b); w sits b (instead of a).
        for (const s of [...plans[a].field]) {
          if (!plans[b].bench.has(s)) continue;
          for (const w of [...plans[a].bench]) {
            if (!plans[b].field.has(w)) continue;
            const d = strength(w) - strength(s); // change to a's sum; b moves by -d
            if (d === 0) continue;
            const before = sums[a] ** 2 + sums[b] ** 2;
            const after = (sums[a] + d) ** 2 + (sums[b] - d) ** 2;
            // The mean is unchanged by a trade, so comparing raw squares is enough.
            const delta = after - before;
            if (delta >= -EPS || (best && delta >= best.delta)) continue;
            // Never let evening-out lift an earlier rotation above the finish.
            if (sums[a] + d > finalSum + EPS || sums[b] - d > finalSum + EPS) continue;
            if (!tradeKeepsRestPattern(plans, a, b, w, s)) continue;
            best = { a, b, s, w, delta };
          }
        }
      }
    }
    if (!best) break;
    const d = strength(best.w) - strength(best.s);
    trade(plans, best.a, best.b, best.w, best.s);
    sums[best.a] += d;
    sums[best.b] -= d;
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
 * How good a finished plan is, for choosing between attempts: strongest finish first,
 * then the most even earlier rotations. Higher is better.
 */
export function scorePlan(plans: RotationPlan[], strength: (name: string) => number): [number, number] {
  const sum = (p: RotationPlan) =>
    [...p.field, ...p.locked].reduce((a, n) => a + strength(n), 0);
  const last = plans.length - 1;
  const early = plans.slice(0, last).map(sum);
  const mean = early.reduce((a, b) => a + b, 0) / Math.max(1, early.length);
  const variance = early.reduce((a, b) => a + (b - mean) ** 2, 0);
  return [sum(plans[last]), -variance];
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
