import { playersOnField } from '../constants';
import type { AppState, Player, PositionDef, PositionId, Rotation } from '../types';
import { availablePlayersForGame, cloneRotation, ensureShape, getGame, namesOnField, shuffleArr } from './utils';
import { finishStrong, scorePlan, type RotationPlan } from './strongFinish';

const STRONG_FINISH_ATTEMPTS = 24;
import { clampLevel, lineWeakCap, SKILL_LOW, SKILL_NEUTRAL } from './skills';

/** Rotations spent at each position id, plus `total` (the key can't clash: ids are generated). */
type Counts = Record<PositionId, number> & { total: number };

/**
 * Rating lookups for one generation run. Built from the FULL roster rather than the
 * available players, so an inactive or game-excluded player sitting in a locked slot is
 * still rated correctly. A name on no roster at all — a deleted player still referenced
 * by a locked slot — reads as unrated, which never blocks anything.
 */
function buildSkillIndex(players: Player[], positions: PositionDef[]) {
  const byName = new Map(players.map(p => [p.name, p]));
  const skillOf = new Map(positions.map(p => [p.id, p.skill]));
  const gameSkills = [...new Set(positions.map(p => p.skill))];

  const levelAt = (pos: PositionId, name: string | null | undefined): number => {
    if (!name) return 0;
    const skill = skillOf.get(pos);
    return skill ? clampLevel(byName.get(name)?.skills?.[skill]) : 0;
  };

  return {
    /** Weak at the skill governing `pos`. Unrated (0) is deliberately not weak. */
    isLow: (pos: PositionId, name: string | null | undefined): boolean =>
      levelAt(pos, name) === SKILL_LOW,
    /** Level for averaging, with unrated counted as neutral so it never skews a line. */
    strengthAt: (pos: PositionId, name: string | null | undefined): number =>
      levelAt(pos, name) || SKILL_NEUTRAL,
    /**
     * One number per player for comparing whole rotations: the mean of every skill this
     * game's positions are rated by (soccer: Defense and Offense; basketball: Overall),
     * unrated counting as neutral.
     */
    overall: (name: string): number => {
      if (!gameSkills.length) return SKILL_NEUTRAL;
      const p = byName.get(name);
      const sum = gameSkills.reduce((a, k) => a + (clampLevel(p?.skills?.[k]) || SKILL_NEUTRAL), 0);
      return sum / gameSkills.length;
    },
  };
}

type SkillIndex = ReturnType<typeof buildSkillIndex>;

/**
 * Trades an excess weak player out of an over-cap position line for a non-weak player
 * standing in another line. Needed because `posOrder` is shuffled: defense can be filled
 * last, with only weak players left, even though a perfectly good defender is parked in
 * midfield.
 *
 * Only ever touches two field slots at a time and never reads or writes `rot.bench`, so
 * who plays this rotation is untouched by construction.
 */
function repairWeakLines(rot: Rotation, posIds: PositionId[], counts: Record<string, Counts>, skills: SkillIndex): void {
  posIds.forEach(pos => {
    const size = rot.slots[pos].length;
    if (size === 0) return;
    const cap = lineWeakCap(size);

    // Every successful swap strictly decreases this line's weak count by one, and that
    // count is a non-negative integer bounded by `size`, so this terminates. The guard
    // is belt and braces.
    let guard = size + 1;
    while (guard-- > 0) {
      if (rot.slots[pos].filter(n => skills.isLow(pos, n)).length <= cap) break;

      const outIdx = rot.slots[pos].findIndex((n, i) => skills.isLow(pos, n) && !rot.locked[pos][i]);
      if (outIdx === -1) break; // every excess weak player is locked in — locks win

      const outName = rot.slots[pos][outIdx]!;
      const donor = findDonor(rot, posIds, counts, skills, pos, outName);
      if (!donor) break; // nothing legal to trade with — leave it for the WEAK flag

      const inName = rot.slots[donor.pos][donor.sIdx]!;
      rot.slots[pos][outIdx] = inName;
      rot.slots[donor.pos][donor.sIdx] = outName;

      // Each player loses a credit where they left and gains one where they landed.
      // `.total` is deliberately untouched: both were already on the field. The guards
      // cover players with no counts entry (locked-in inactive/excluded/deleted).
      if (counts[inName]) { counts[inName][donor.pos]--; counts[inName][pos]++; }
      if (counts[outName]) { counts[outName][pos]--; counts[outName][donor.pos]++; }
    }
  });
}

/**
 * Picks which player to pull into the over-cap line. Preference order: whoever has spent
 * the least time at that position this game (the same greedy criterion the main
 * assignment loop uses, so the swap disturbs positional balance as little as possible),
 * then where the outgoing player has spent the least time, then random.
 */
function findDonor(
  rot: Rotation,
  posIds: PositionId[],
  counts: Record<string, Counts>,
  skills: SkillIndex,
  pos: PositionId,
  outName: string,
): { pos: PositionId; sIdx: number; name: string } | null {
  const candidates: { pos: PositionId; sIdx: number; name: string }[] = [];

  posIds.forEach(p2 => {
    if (p2 === pos) return;
    const donorCap = lineWeakCap(rot.slots[p2].length);
    const donorWeak = rot.slots[p2].filter(n => skills.isLow(p2, n)).length;

    rot.slots[p2].forEach((n, i) => {
      if (!n) return;                          // empty slot — nothing to trade
      if (rot.locked[p2][i]) return;           // locked slot — immovable
      // Judged by the OVER-CAP line's skill: a donor who is also weak there solves nothing.
      if (skills.isLow(pos, n)) return;
      // And the trade must not push the donor's own line further over its cap. A line
      // that is ALREADY over cap — every forward weak on offense, say — may still take
      // the swap as long as it comes out no worse, which is what lets an otherwise
      // hopeless attack still donate a competent defender.
      const after = donorWeak - (skills.isLow(p2, n) ? 1 : 0) + (skills.isLow(p2, outName) ? 1 : 0);
      if (after > Math.max(donorCap, donorWeak)) return;
      candidates.push({ pos: p2, sIdx: i, name: n });
    });
  });

  if (!candidates.length) return null;

  return shuffleArr(candidates).sort((a, b) => {
    const d = (counts[a.name]?.[pos] ?? 0) - (counts[b.name]?.[pos] ?? 0);
    if (d !== 0) return d;
    return (counts[outName]?.[a.pos] ?? 0) - (counts[outName]?.[b.pos] ?? 0);
  })[0];
}

/**
 * Pure function: returns new rotations for the current game.
 * Respects played rotations (frozen) and locked slots (fixed).
 * Balances position time using cumulative counts from the current game only.
 * Avoids benching the same player two rotations in a row when possible.
 *
 * When `settings.useSkillRatings` is on it also spreads talent across the position
 * lines, and — with `settings.strongFinish` — puts the strongest group on for the final
 * rotation while evening out the rest (see finishStrong). Neither changes how many
 * rotations anyone plays: both run after the playing-time pass and only rearrange it.
 */
export function autoGenerate(
  state: Pick<AppState, 'players' | 'games' | 'curGame' | 'settings'>,
): Rotation[] {
  const game = getGame(state.games, state.curGame);
  if (!game) return [];

  const available = availablePlayersForGame(state.players, game);
  if (available.length < playersOnField(game.positions)) return game.rotations;

  const posIds = game.positions.map(p => p.id);
  const useSkills = state.settings.useSkillRatings;
  const skills = buildSkillIndex(state.players, game.positions);

  const zeroCounts = (): Counts => {
    const c = { total: 0 } as Counts;
    posIds.forEach(id => { c[id] = 0; });
    return c;
  };

  // Deep-clone the current game's rotations so we don't mutate state
  const rotations: Rotation[] = game.rotations.map(r => ensureShape(cloneRotation(r), game.positions));

  // Counts from PLAYED rotations in the current game only
  const counts: Record<string, Counts> = {};
  available.forEach(p => { counts[p] = zeroCounts(); });

  rotations.forEach(rot => {
    if (!rot.played) return;
    posIds.forEach(pos => {
      rot.slots[pos].forEach(p => {
        if (p && counts[p]) { counts[p][pos]++; counts[p].total++; }
      });
    });
  });

  // ── Phase 1: who sits each rotation (playing time). ──────────────────────────
  // Greedy, rotation by rotation: the most-played sit first. Only `.total` is used here.

  interface Work {
    lockedNames: Set<string>;
    openSlots: { pos: PositionId; sIdx: number }[];
  }

  // Rotations played so far, per player — the starting point for every attempt below.
  const playedTotals = new Map(available.map(p => [p, counts[p].total]));

  /**
   * With no `target`, the plain greedy: most-played sit first. With one — each player's
   * total from an earlier attempt — it sits whoever is furthest ahead of their target
   * instead, so a re-roll reshuffles WHEN people sit without changing who got the odd
   * extra rotation. Returns the totals it actually produced.
   */
  function planPlayingTime(target?: Map<string, number>) {
    const totals = new Map(playedTotals);
    const work: (Work | null)[] = [];
    const plans: RotationPlan[] = [];
    let prevBench = new Set<string>();

    rotations.forEach(rot => {
      if (rot.played) {
        prevBench = new Set(rot.bench);
        work.push(null);
        plans.push({ played: true, locked: new Set(), field: new Set(namesOnField(rot)), bench: new Set(rot.bench) });
        return;
      }

      // Collect locked player names
      const lockedNames = new Set<string>();
      posIds.forEach(pos => {
        rot.slots[pos].forEach((p, sIdx) => {
          if (rot.locked[pos][sIdx] && p) lockedNames.add(p);
        });
      });

      // Clear only unlocked slots and bench (idempotent, so safe to repeat per attempt)
      posIds.forEach(pos => {
        rot.slots[pos].forEach((_val, sIdx) => {
          if (!rot.locked[pos][sIdx]) rot.slots[pos][sIdx] = null;
        });
      });
      rot.bench = [];

      // Open slots that need filling
      const openSlots: { pos: PositionId; sIdx: number }[] = [];
      posIds.forEach(pos => {
        rot.slots[pos].forEach((_p, sIdx) => {
          if (!rot.locked[pos][sIdx]) openSlots.push({ pos, sIdx });
        });
      });

      const fieldable = available.filter(p => !lockedNames.has(p));
      const benchSize = Math.max(0, fieldable.length - openSlots.length);

      // Sort: most-played players bench first.
      // Tie-break: players who were benched last rotation sort later (bench last) to avoid
      // consecutive bench. Shuffle first so equal-count ties break randomly — which is
      // also what decides, at random, who gets an extra rotation when time can't split
      // evenly.
      const ahead = (p: string) => totals.get(p)! - (target?.get(p) ?? 0);
      const sorted = shuffleArr([...fieldable]).sort((a, b) => {
        const playDiff = ahead(b) - ahead(a);
        if (playDiff !== 0) return playDiff;
        // Among equal total plays, push previously-benched players toward the field
        const aPrev = prevBench.has(a) ? 1 : 0;
        const bPrev = prevBench.has(b) ? 1 : 0;
        return aPrev - bPrev;
      });

      const bench = sorted.slice(0, benchSize);
      const fieldPlayers = sorted.slice(benchSize);
      fieldPlayers.forEach(p => { totals.set(p, totals.get(p)! + 1); });
      prevBench = new Set(bench);

      work.push({ lockedNames, openSlots });
      plans.push({ played: false, locked: lockedNames, field: new Set(fieldPlayers), bench: new Set(bench) });
    });

    return { work, plans, totals };
  }

  // ── Phase 2: when they sit (talent across rotations). ───────────────────────
  // finishStrong only swaps WHICH rotations a player sits, never how many, so phase 1's
  // playing time stands exactly. A single greedy schedule can box it in (the no-back-to-
  // back rule blocks the last trade), so with the setting on, try a few fair schedules
  // and keep the best result. Each attempt costs well under a millisecond.
  const strongFinish = useSkills && state.settings.strongFinish;
  const first = planPlayingTime();
  let { work, plans } = first;
  if (strongFinish) {
    finishStrong(plans, skills.overall);
    let best = scorePlan(plans, skills.overall);
    for (let attempt = 1; attempt < STRONG_FINISH_ATTEMPTS; attempt++) {
      const next = planPlayingTime(first.totals);
      // Choosing the best of several draws must not tilt who gets extra time toward the
      // stronger players, so only re-rolls that hit exactly the first draw's totals count.
      if (available.some(p => next.totals.get(p) !== first.totals.get(p))) continue;
      finishStrong(next.plans, skills.overall);
      const score = scorePlan(next.plans, skills.overall);
      if (score[0] > best[0] || (score[0] === best[0] && score[1] > best[1])) {
        ({ work, plans } = next);
        best = score;
      }
    }
  }

  // ── Phase 3: positions, rotation by rotation. ───────────────────────────────
  // Nothing from here on changes who plays, so playing time and the
  // no-back-to-back-bench rule are unaffected by the skill layer.

  rotations.forEach((rot, rIdx) => {
    const w = work[rIdx];
    if (!w) return;
    const { lockedNames, openSlots } = w;
    const plan = plans[rIdx];
    const fieldPlayers = [...plan.field];
    rot.bench = available.filter(p => plan.bench.has(p)); // roster order

    // Group open slots by position
    const byPos: Record<string, number[]> = {};
    posIds.forEach(id => { byPos[id] = []; });
    openSlots.forEach(s => byPos[s.pos].push(s.sIdx));

    // Assign field players to positions greedily by position-specific count.
    // Randomize position order each rotation to remove systematic bias.
    let remaining = [...fieldPlayers];
    const posOrder = shuffleArr(posIds);

    function place(pos: PositionId, sIdx: number, p: string) {
      rot.slots[pos][sIdx] = p;
      counts[p][pos]++;
    }

    // Mean strength of this rotation's field players, per position's governing skill.
    // Keeping each line near this is what "spread the talent" means when no cap is biting.
    const onField = [...fieldPlayers, ...lockedNames];
    function targetFor(pos: PositionId): number {
      if (!onField.length) return SKILL_NEUTRAL;
      return onField.reduce((a, n) => a + skills.strengthAt(pos, n), 0) / onField.length;
    }

    posOrder.forEach(pos => {
      if (!byPos[pos].length) return;

      if (!useSkills) {
        remaining = shuffleArr(remaining).sort((a, b) => counts[a][pos] - counts[b][pos]);
        byPos[pos].forEach(sIdx => {
          const p = remaining.shift();
          if (p) place(pos, sIdx, p);
        });
        return;
      }

      const cap = lineWeakCap(rot.slots[pos].length);
      const target = targetFor(pos);
      // Seed from players already standing here — i.e. locked slots, which were never
      // cleared above and are invisible to `counts`.
      let lowPlaced = rot.slots[pos].filter(n => skills.isLow(pos, n)).length;
      let lineSum = rot.slots[pos].reduce((a, n) => a + (n ? skills.strengthAt(pos, n) : 0), 0);
      let lineCount = rot.slots[pos].filter(Boolean).length;

      byPos[pos].forEach(sIdx => {
        // Re-sorted per slot so the talent term reflects how the line has filled so far.
        remaining = shuffleArr(remaining).sort((a, b) => {
          const d = counts[a][pos] - counts[b][pos];
          if (d !== 0) return d; // positional fairness always wins
          // Among players equally owed this position, prefer whoever leaves the line's
          // average strength closest to the rotation's average. Genuine ties on both
          // keys still fall back to the shuffle above.
          const da = Math.abs((lineSum + skills.strengthAt(pos, a)) / (lineCount + 1) - target);
          const db = Math.abs((lineSum + skills.strengthAt(pos, b)) / (lineCount + 1) - target);
          return da - db;
        });

        let idx = 0;
        // A cheap first pass: avoid creating a violation rather than repairing one, which
        // keeps the repair pass from having to shuffle slots around afterwards. It is NOT
        // the guarantee — repairWeakLines below is — and mutation testing confirms the
        // repair alone satisfies every case the test suite covers. Keep both: this one
        // costs nothing and leaves positional balance less disturbed.
        if (lowPlaced >= cap) {
          // `remaining` is already sorted by positional count, so the first non-weak
          // candidate is also the one most owed this position — the cap costs as little
          // positional fairness as it can. If everyone left is weak, fall back to the
          // plain greedy pick: the cap is soft, and the WEAK flag will show.
          const alt = remaining.findIndex(n => !skills.isLow(pos, n));
          if (alt !== -1) idx = alt;
        }

        const [p] = remaining.splice(idx, 1);
        if (!p) return; // fewer players than slots — leave it null, as shift() did

        place(pos, sIdx, p);
        if (skills.isLow(pos, p)) lowPlaced++;
        lineSum += skills.strengthAt(pos, p);
        lineCount++;
      });
    });

    if (useSkills) repairWeakLines(rot, posIds, counts, skills);
  });

  return rotations;
}
