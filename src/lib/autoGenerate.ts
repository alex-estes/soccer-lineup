import { POSITIONS, FIELD_SIZE } from '../constants';
import type { AppState, Position, Rotation } from '../types';
import { activePlayers, ensureShape, shuffleArr } from './utils';

interface Counts {
  def: number;
  mid: number;
  fwd: number;
  total: number;
}

/**
 * Pure function: returns new rotations for the current game.
 * Respects played rotations (frozen) and locked slots (fixed).
 * Balances position time using cumulative counts from the current game only.
 * Avoids benching the same player two rotations in a row when possible.
 */
export function autoGenerate(state: Pick<AppState, 'players' | 'games' | 'curGame'>): Rotation[] {
  const active = activePlayers(state.players);
  if (active.length < FIELD_SIZE) return state.games[state.curGame].rotations;

  // Counts from PLAYED rotations in the current game only
  const counts: Record<string, Counts> = {};
  active.forEach(p => { counts[p] = { def: 0, mid: 0, fwd: 0, total: 0 }; });

  state.games[state.curGame].rotations.forEach(rot => {
    ensureShape(rot);
    if (!rot.played) return;
    POSITIONS.forEach(pos => {
      rot[pos].forEach(p => {
        if (p && counts[p]) { counts[p][pos]++; counts[p].total++; }
      });
    });
  });

  // Deep-clone the current game's rotations so we don't mutate state
  const rotations: Rotation[] = state.games[state.curGame].rotations.map(r => ({
    ...r,
    def: [...r.def] as [string | null, string | null],
    mid: [...r.mid] as [string | null, string | null],
    fwd: [...r.fwd] as [string | null, string | null],
    bench: [...r.bench],
    locked: {
      def: [...r.locked.def] as [boolean, boolean],
      mid: [...r.locked.mid] as [boolean, boolean],
      fwd: [...r.locked.fwd] as [boolean, boolean],
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

    const available = active.filter(p => !lockedNames.has(p));
    const benchSize = Math.max(0, available.length - openSlots.length);

    // Sort: most-played players bench first.
    // Tie-break: players who were benched last rotation sort later (bench last) to avoid
    // consecutive bench. Shuffle first so equal-count ties break randomly.
    const sorted = shuffleArr([...available]).sort((a, b) => {
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

    // Group open slots by position
    const byPos: Record<string, number[]> = { def: [], mid: [], fwd: [] };
    openSlots.forEach(s => byPos[s.pos].push(s.sIdx));

    // Assign field players to positions greedily by position-specific count.
    // Randomize position order each rotation to remove systematic bias.
    let remaining = [...fieldPlayers];
    const posOrder = shuffleArr([...POSITIONS] as Position[]);

    posOrder.forEach(pos => {
      if (!byPos[pos].length) return;
      remaining = shuffleArr(remaining).sort((a, b) => counts[a][pos] - counts[b][pos]);
      byPos[pos].forEach(sIdx => {
        const p = remaining.shift();
        if (p) {
          rot[pos][sIdx] = p;
          counts[p][pos]++;
          counts[p].total++;
        }
      });
    });
  });

  return rotations;
}
