import { describe, expect, it } from 'vitest';
import { initialState, reducer } from './reducer';
import type { AppState, MoveSource, MoveTarget, Rotation } from '../types';

// One rotation: def [A, B], mid [C, null], fwd [D], bench [E, F]; B is locked.
function mkState(): AppState {
  const rot: Rotation = {
    def: ['A', 'B'],
    mid: ['C', null],
    fwd: ['D'],
    bench: ['E', 'F'],
    played: false,
    locked: { def: [false, true], mid: [false, false], fwd: [false] },
  };
  const game = { ...initialState.games[0], rotations: [rot] };
  return { ...initialState, games: [game], curGame: game.id };
}

function move(drag: MoveSource, target: MoveTarget): Rotation {
  return reducer(mkState(), { type: 'MOVE_PLAYER', drag, target }).games[0].rotations[0];
}

describe('MOVE_PLAYER', () => {
  it('bench → filled slot sends the displaced player to the bench', () => {
    const r = move({ type: 'bench', rIdx: 0, playerName: 'E' }, { type: 'slot', rIdx: 0, pos: 'fwd', sIdx: 0 });
    expect(r.fwd).toEqual(['E']);
    expect(r.bench).toEqual(['F', 'D']);
  });

  it('slot → filled slot swaps the two players', () => {
    const r = move({ type: 'slot', rIdx: 0, playerName: 'A', pos: 'def', sIdx: 0 }, { type: 'slot', rIdx: 0, pos: 'fwd', sIdx: 0 });
    expect(r.def).toEqual(['D', 'B']);
    expect(r.fwd).toEqual(['A']);
    expect(r.bench).toEqual(['E', 'F']);
  });

  it('slot → empty slot moves the player and leaves the source empty', () => {
    const r = move({ type: 'slot', rIdx: 0, playerName: 'A', pos: 'def', sIdx: 0 }, { type: 'slot', rIdx: 0, pos: 'mid', sIdx: 1 });
    expect(r.def).toEqual([null, 'B']);
    expect(r.mid).toEqual(['C', 'A']);
  });

  it('refuses to move onto a locked slot', () => {
    const r = move({ type: 'bench', rIdx: 0, playerName: 'E' }, { type: 'slot', rIdx: 0, pos: 'def', sIdx: 1 });
    expect(r.def).toEqual(['A', 'B']);
    expect(r.bench).toEqual(['E', 'F']);
  });
});
