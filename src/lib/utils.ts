import type { Player, Rotation, Game, PositionDef } from '../types';

export function activePlayers(players: Player[]): string[] {
  return players.filter(p => p.active).map(p => p.name);
}

export function availablePlayersForGame(players: Player[], game: Game): string[] {
  return activePlayers(players).filter(name => !game.excludedPlayers.includes(name));
}

export function getGame(games: Game[], gameId: string): Game | undefined {
  return games.find(g => g.id === gameId);
}

export function emptyRotation(positions: PositionDef[]): Rotation {
  const slots: Rotation['slots'] = {};
  const locked: Rotation['locked'] = {};
  positions.forEach(p => {
    slots[p.id] = Array(p.count).fill(null);
    locked[p.id] = Array(p.count).fill(false);
  });
  return { slots, locked, bench: [], played: false };
}

export function emptyRotations(positions: PositionDef[], count: number): Rotation[] {
  return Array.from({ length: count }, () => emptyRotation(positions));
}

/** Every player name standing in one of the rotation's slots. */
export function namesOnField(rot: Rotation): string[] {
  const out: string[] = [];
  Object.values(rot.slots).forEach(line => line.forEach(n => { if (n) out.push(n); }));
  return out;
}

/** Deep copy, so callers can mutate slot arrays freely. */
export function cloneRotation(r: Rotation): Rotation {
  const slots: Rotation['slots'] = {};
  const locked: Rotation['locked'] = {};
  Object.keys(r.slots).forEach(k => { slots[k] = [...r.slots[k]]; });
  Object.keys(r.locked).forEach(k => { locked[k] = [...r.locked[k]]; });
  return { slots, locked, bench: [...r.bench], played: r.played };
}

/**
 * Backfills only what's missing — a position the game lists but the rotation has no
 * slots for, or a lock array that is absent. Never pads/truncates an existing array, so
 * rotations keep the slot counts they were generated with.
 */
export function ensureShape(rot: Rotation, positions: PositionDef[]): Rotation {
  if (!rot.slots || typeof rot.slots !== 'object') rot.slots = {};
  if (!rot.locked || typeof rot.locked !== 'object') rot.locked = {};
  positions.forEach(p => {
    if (!Array.isArray(rot.slots[p.id])) rot.slots[p.id] = Array(p.count).fill(null);
    if (!Array.isArray(rot.locked[p.id])) rot.locked[p.id] = rot.slots[p.id].map(() => false);
  });
  if (!Array.isArray(rot.bench)) rot.bench = [];
  if (rot.played === undefined) rot.played = false;
  return rot;
}

export function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
