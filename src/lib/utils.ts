import { NUM_ROT, POSITIONS } from '../constants';
import type { Player, Rotation, LockedSlots, FormationSettings, Game } from '../types';

export function activePlayers(players: Player[]): string[] {
  return players.filter(p => p.active).map(p => p.name);
}

export function availablePlayersForGame(players: Player[], game: Game): string[] {
  return activePlayers(players).filter(name => !game.excludedPlayers.includes(name));
}

export function getGame(games: Game[], gameId: string): Game | undefined {
  return games.find(g => g.id === gameId);
}

export function emptyLockedSlots(formation: FormationSettings): LockedSlots {
  return {
    def: Array(formation.defenders).fill(false),
    mid: Array(formation.midfielders).fill(false),
    fwd: Array(formation.forwards).fill(false),
  };
}

export function emptyRotations(formation: FormationSettings, count: number = NUM_ROT): Rotation[] {
  return Array.from({ length: count }, () => ({
    def: Array(formation.defenders).fill(null),
    mid: Array(formation.midfielders).fill(null),
    fwd: Array(formation.forwards).fill(null),
    bench: [],
    played: false,
    locked: emptyLockedSlots(formation),
  }));
}

// Backfills only what's missing (a wholly-absent `locked`, or a wholly-absent
// per-position array within it) — never pads/truncates an existing array to a
// "current" formation size. This is what lets rotations from before a formation
// change keep their original slot counts instead of being silently resized.
export function ensureShape(rot: Rotation): Rotation {
  POSITIONS.forEach(pos => {
    if (!Array.isArray(rot[pos])) rot[pos] = [];
  });
  if (!Array.isArray(rot.bench)) rot.bench = [];
  if (!rot.locked) {
    rot.locked = {
      def: rot.def.map(() => false),
      mid: rot.mid.map(() => false),
      fwd: rot.fwd.map(() => false),
    };
  } else {
    POSITIONS.forEach(pos => {
      if (!Array.isArray(rot.locked[pos])) rot.locked[pos] = rot[pos].map(() => false);
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
