import { POSITIONS } from '../constants';
import type { AppState, Player, Position, Rotation, SkillKey } from '../types';
import { availablePlayersForGame, ensureShape, getGame, shuffleArr } from './utils';
import { lineWeakCap, normalizeSkills, POSITION_SKILL, SKILL_LOW, SKILL_NEUTRAL } from './skills';

interface Counts {
  def: number;
  mid: number;
  fwd: number;
  total: number;
}

/**
 * Rating lookups for one generation run. Built from the FULL roster rather than the
 * available players, so an inactive or game-excluded player sitting in a locked slot is
 * still rated correctly. A name on no roster at all — a deleted player still referenced
 * by a locked slot — reads as unrated, which never blocks anything.
 */
function buildSkillIndex(players: Player[]) {
  const levels: Record<string, Record<SkillKey, number>> = {};
  players.forEach(p => { levels[p.name] = normalizeSkills(p.skills); });

  const levelAt = (pos: Position, name: string | null | undefined): number =>
    name ? (levels[name]?.[POSITION_SKILL[pos]] ?? 0) : 0;

  return {
    /** Weak at the skill governing `pos`. Unrated (0) is deliberately not weak. */
    isLow: (pos: Position, name: string | null | undefined): boolean =>
      levelAt(pos, name) === SKILL_LOW,
    /** Level for averaging, with unrated counted as neutral so it never skews a line. */
    strengthAt: (pos: Position, name: string | null | undefined): number =>
      levelAt(pos, name) || SKILL_NEUTRAL,
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
function repairWeakLines(rot: Rotation, counts: Record<string, Counts>, skills: SkillIndex): void {
  POSITIONS.forEach(pos => {
    const size = rot[pos].length;
    if (size === 0) return;
    const cap = lineWeakCap(size);

    // Every successful swap strictly decreases this line's weak count by one, and that
    // count is a non-negative integer bounded by `size`, so this terminates. The guard
    // is belt and braces.
    let guard = size + 1;
    while (guard-- > 0) {
      if (rot[pos].filter(n => skills.isLow(pos, n)).length <= cap) break;

      const outIdx = rot[pos].findIndex((n, i) => skills.isLow(pos, n) && !rot.locked[pos][i]);
      if (outIdx === -1) break; // every excess weak player is locked in — locks win

      const outName = rot[pos][outIdx]!;
      const donor = findDonor(rot, counts, skills, pos, outName);
      if (!donor) break; // nothing legal to trade with — leave it for the WEAK flag

      const inName = rot[donor.pos][donor.sIdx]!;
      rot[pos][outIdx] = inName;
      rot[donor.pos][donor.sIdx] = outName;

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
  counts: Record<string, Counts>,
  skills: SkillIndex,
  pos: Position,
  outName: string,
): { pos: Position; sIdx: number; name: string } | null {
  const candidates: { pos: Position; sIdx: number; name: string }[] = [];

  POSITIONS.forEach(p2 => {
    if (p2 === pos) return;
    const donorCap = lineWeakCap(rot[p2].length);
    const donorWeak = rot[p2].filter(n => skills.isLow(p2, n)).length;

    rot[p2].forEach((n, i) => {
      if (!n) return;                          // empty slot — nothing to trade
      if (rot.locked[p2][i]) return;           // locked slot — immovable
      // Judged by the OVER-CAP line's skill: a donor who is also weak there solves nothing.
      if (skills.isLow(pos, n)) return;
      // And the trade must not push the donor's own line over its cap.
      const after = donorWeak - (skills.isLow(p2, n) ? 1 : 0) + (skills.isLow(p2, outName) ? 1 : 0);
      if (after > donorCap) return;
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
 * lines — see the assignment step below. That layer runs strictly after bench selection
 * and so cannot change who plays, only which position they take.
 */
export function autoGenerate(
  state: Pick<AppState, 'players' | 'games' | 'curGame' | 'settings'>,
): Rotation[] {
  const game = getGame(state.games, state.curGame);
  if (!game) return [];

  const available = availablePlayersForGame(state.players, game);
  if (available.length < game.formation.playersOnField) return game.rotations;

  const useSkills = state.settings.useSkillRatings;
  const skills = buildSkillIndex(state.players);

  // Counts from PLAYED rotations in the current game only
  const counts: Record<string, Counts> = {};
  available.forEach(p => { counts[p] = { def: 0, mid: 0, fwd: 0, total: 0 }; });

  game.rotations.forEach(rot => {
    ensureShape(rot);
    if (!rot.played) return;
    POSITIONS.forEach(pos => {
      rot[pos].forEach(p => {
        if (p && counts[p]) { counts[p][pos]++; counts[p].total++; }
      });
    });
  });

  // Deep-clone the current game's rotations so we don't mutate state
  const rotations: Rotation[] = game.rotations.map(r => ({
    ...r,
    def: [...r.def],
    mid: [...r.mid],
    fwd: [...r.fwd],
    bench: [...r.bench],
    locked: {
      def: [...r.locked.def],
      mid: [...r.locked.mid],
      fwd: [...r.locked.fwd],
    },
  }));

  // Track who was benched in the previous rotation to avoid consecutive bench
  let prevBench = new Set<string>();

  rotations.forEach(rot => {
    ensureShape(rot);
    if (rot.played) {
      prevBench = new Set(rot.bench);
      return;
    }

    // Collect locked player names
    const lockedNames = new Set<string>();
    POSITIONS.forEach(pos => {
      rot[pos].forEach((p, sIdx) => {
        if (rot.locked[pos][sIdx] && p) lockedNames.add(p);
      });
    });

    // Clear only unlocked slots and bench
    POSITIONS.forEach(pos => {
      rot[pos].forEach((_val, sIdx) => {
        if (!rot.locked[pos][sIdx]) rot[pos][sIdx] = null;
      });
    });
    rot.bench = [];

    // Open slots that need filling
    const openSlots: { pos: Position; sIdx: number }[] = [];
    POSITIONS.forEach(pos => {
      rot[pos].forEach((_p, sIdx) => {
        if (!rot.locked[pos][sIdx]) openSlots.push({ pos, sIdx });
      });
    });

    const fieldable = available.filter(p => !lockedNames.has(p));
    const benchSize = Math.max(0, fieldable.length - openSlots.length);

    // Sort: most-played players bench first.
    // Tie-break: players who were benched last rotation sort later (bench last) to avoid
    // consecutive bench. Shuffle first so equal-count ties break randomly.
    const sorted = shuffleArr([...fieldable]).sort((a, b) => {
      const playDiff = counts[b].total - counts[a].total;
      if (playDiff !== 0) return playDiff;
      // Among equal total plays, push previously-benched players toward the field
      const aPrev = prevBench.has(a) ? 1 : 0;
      const bPrev = prevBench.has(b) ? 1 : 0;
      return aPrev - bPrev;
    });

    const bench = sorted.slice(0, benchSize);
    const fieldPlayers = sorted.slice(benchSize);

    rot.bench = bench;
    prevBench = new Set(bench);

    // ── Everything below assigns POSITIONS to the players already chosen above.
    // Nothing from here on reads or writes rot.bench, so playing time and the
    // no-back-to-back-bench rule are unaffected by the skill layer.

    // Group open slots by position
    const byPos: Record<string, number[]> = { def: [], mid: [], fwd: [] };
    openSlots.forEach(s => byPos[s.pos].push(s.sIdx));

    // Assign field players to positions greedily by position-specific count.
    // Randomize position order each rotation to remove systematic bias.
    let remaining = [...fieldPlayers];
    const posOrder = shuffleArr([...POSITIONS] as Position[]);

    function place(pos: Position, sIdx: number, p: string) {
      rot[pos][sIdx] = p;
      counts[p][pos]++;
      counts[p].total++;
    }

    // Mean strength of this rotation's field players, per position's governing skill.
    // Keeping each line near this is what "spread the talent" means when no cap is biting.
    const onField = [...fieldPlayers, ...lockedNames];
    function targetFor(pos: Position): number {
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

      const cap = lineWeakCap(rot[pos].length);
      const target = targetFor(pos);
      // Seed from players already standing here — i.e. locked slots, which were never
      // cleared above and are invisible to `counts`.
      let lowPlaced = rot[pos].filter(n => skills.isLow(pos, n)).length;
      let lineSum = rot[pos].reduce((a, n) => a + (n ? skills.strengthAt(pos, n) : 0), 0);
      let lineCount = rot[pos].filter(Boolean).length;

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

    if (useSkills) repairWeakLines(rot, counts, skills);
  });

  return rotations;
}
