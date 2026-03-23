import { NUM_ROT, POSITIONS, SLOTS_PER } from '../constants';
import type { Player, Rotation, LockedSlots } from '../types';

export function activePlayers(players: Player[]): string[] {
  return players.filter(p => p.active).map(p => p.name);
}

export function emptyLockedSlots(): LockedSlots {
  return {
    def: [false, false],
    mid: [false, false],
    fwd: [false, false],
  };
}

export function emptyRotations(): Rotation[] {
  return Array.from({ length: NUM_ROT }, () => ({
    def: [null, null],
    mid: [null, null],
    fwd: [null, null],
    bench: [],
    played: false,
    locked: emptyLockedSlots(),
  }));
}

export function ensureShape(rot: Rotation): Rotation {
  if (!rot.locked) {
    rot.locked = emptyLockedSlots();
  } else {
    POSITIONS.forEach(pos => {
      if (!rot.locked[pos]) rot.locked[pos] = [false, false];
      while (rot.locked[pos].length < SLOTS_PER) rot.locked[pos].push(false);
    });
  }
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
