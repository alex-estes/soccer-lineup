import { POSITIONS, FIELD_SIZE } from '../constants';
import type { AppState, Rotation } from '../types';
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

  rotations.forEach(rot => {
    ensureShape(rot);
    if (rot.played) return;

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
    const openSlots: { pos: 'def' | 'mid' | 'fwd'; sIdx: number }[] = [];
    POSITIONS.forEach(pos => {
      rot[pos].forEach((_p, sIdx) => {
        if (!rot.locked[pos][sIdx]) openSlots.push({ pos, sIdx });
      });
    });

    const openCount = openSlots.length;
    const available = active.filter(p => !lockedNames.has(p));

    // Shuffle first so equal-count ties break randomly (not by array order)
    const sorted = shuffleArr(available).sort((a, b) => counts[a].total - counts[b].total);
    const onField = sorted.slice(0, openCount);
    rot.bench = sorted.slice(openCount);

    // Group open slots by position
    const byPos: Record<string, number[]> = { def: [], mid: [], fwd: [] };
    openSlots.forEach(s => byPos[s.pos].push(s.sIdx));

    // Assign greedily: for each position, shuffle before sorting so ties break randomly
    let remaining = [...onField];
    POSITIONS.forEach(pos => {
      if (!byPos[pos].length) return;
      remaining = shuffleArr(remaining);
      remaining.sort((a, b) => counts[a][pos] - counts[b][pos]);
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
