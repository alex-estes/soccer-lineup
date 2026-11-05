import { describe, expect, it } from 'vitest';
import { reducer } from './reducer';
import { F222, HOOPS, mkHoopsPlayers, mkPlayers, mkState } from '../test/fixtures';
import type { AppState, MoveSource, MoveTarget, Rotation } from '../types';

// One rotation: def [A, B], mid [C, null], fwd [D], bench [E, F]; B is locked.
function moveState(): AppState {
  const rot: Rotation = {
    slots: { def: ['A', 'B'], mid: ['C', null], fwd: ['D'] },
    locked: { def: [false, true], mid: [false, false], fwd: [false] },
    bench: ['E', 'F'],
    played: false,
  };
  const state = mkState(mkPlayers(['A', 'B', 'C', 'D', 'E', 'F']));
  state.games[0] = { ...state.games[0], rotations: [rot] };
  return state;
}

function move(drag: MoveSource, target: MoveTarget): Rotation {
  return reducer(moveState(), { type: 'MOVE_PLAYER', drag, target }).games[0].rotations[0];
}

describe('MOVE_PLAYER', () => {
  it('bench → filled slot sends the displaced player to the bench', () => {
    const r = move({ type: 'bench', rIdx: 0, playerName: 'E' }, { type: 'slot', rIdx: 0, pos: 'fwd', sIdx: 0 });
    expect(r.slots.fwd).toEqual(['E']);
    expect(r.bench).toEqual(['F', 'D']);
  });

  it('slot → filled slot swaps the two players', () => {
    const r = move({ type: 'slot', rIdx: 0, playerName: 'A', pos: 'def', sIdx: 0 }, { type: 'slot', rIdx: 0, pos: 'fwd', sIdx: 0 });
    expect(r.slots.def).toEqual(['D', 'B']);
    expect(r.slots.fwd).toEqual(['A']);
    expect(r.bench).toEqual(['E', 'F']);
  });

  it('slot → empty slot moves the player and leaves the source empty', () => {
    const r = move({ type: 'slot', rIdx: 0, playerName: 'A', pos: 'def', sIdx: 0 }, { type: 'slot', rIdx: 0, pos: 'mid', sIdx: 1 });
    expect(r.slots.def).toEqual([null, 'B']);
    expect(r.slots.mid).toEqual(['C', 'A']);
  });

  it('refuses to move onto a locked slot', () => {
    const r = move({ type: 'bench', rIdx: 0, playerName: 'E' }, { type: 'slot', rIdx: 0, pos: 'def', sIdx: 1 });
    expect(r.slots.def).toEqual(['A', 'B']);
    expect(r.bench).toEqual(['E', 'F']);
  });

  it('leaves untouched games as the very same objects, so sync sends nothing for them', () => {
    const before = moveState();
    const other = { ...before.games[0], id: 'other' };
    before.games.push(other);
    const after = reducer(before, {
      type: 'MOVE_PLAYER',
      drag: { type: 'bench', rIdx: 0, playerName: 'E' },
      target: { type: 'slot', rIdx: 0, pos: 'fwd', sIdx: 0 },
    });
    expect(after.games[1]).toBe(other);
    expect(after.players).toBe(before.players);
  });
});

describe('players', () => {
  it('renaming carries the player\'s score and slots along', () => {
    const state = moveState();
    state.games[0].scores = { A: 3 };
    const next = reducer(state, { type: 'RENAME_PLAYER', index: 0, newName: 'Ann' });
    expect(next.games[0].scores).toEqual({ Ann: 3 });
    expect(next.games[0].rotations[0].slots.def).toEqual(['Ann', 'B']);
  });

  it('removing drops them from slots, bench and scores', () => {
    const state = moveState();
    state.games[0].scores = { E: 2, A: 1 };
    const next = reducer(state, { type: 'REMOVE_PLAYER', index: 4 }); // E
    expect(next.games[0].rotations[0].bench).toEqual(['F']);
    expect(next.games[0].scores).toEqual({ A: 1 });
  });

  it('a new basketball player gets the overall rating only', () => {
    const state = mkState([], HOOPS, true, { sport: 'basketball' });
    const next = reducer(state, { type: 'ADD_PLAYER', name: 'Jo' });
    expect(next.players[0].skills).toEqual({ overall: 0 });
  });

  it('sets the overall rating', () => {
    const state = mkState(mkHoopsPlayers(['Jo']), HOOPS, true, { sport: 'basketball' });
    const next = reducer(state, { type: 'SET_PLAYER_SKILL', name: 'Jo', skill: 'overall', level: 3 });
    expect(next.players[0].skills.overall).toBe(3);
  });
});

describe('scores', () => {
  it('stores points on the game and never goes negative', () => {
    const state = mkState(mkHoopsPlayers(['Jo']), HOOPS, true, { sport: 'basketball' });
    let next = reducer(state, { type: 'SET_SCORE', playerName: 'Jo', gameId: 'test-game', count: 5 });
    expect(next.games[0].scores).toEqual({ Jo: 5 });
    next = reducer(next, { type: 'SET_SCORE', playerName: 'Jo', gameId: 'test-game', count: -1 });
    expect(next.games[0].scores).toEqual({ Jo: 0 });
  });
});

describe('editable positions', () => {
  const base = () => mkState(mkPlayers(['A']));

  it('adds a position with one slot and the sport\'s first rated skill', () => {
    const next = reducer(base(), { type: 'ADD_POSITION', name: ' Goalie ' });
    const added = next.settings.positions[3];
    expect(added).toMatchObject({ name: 'Goalie', count: 1, skill: 'defense' });
    expect(added.id).toMatch(/^[0-9a-f]{8}$/);
  });

  it('renames and resizes, but ignores a blank name', () => {
    let next = reducer(base(), { type: 'UPDATE_POSITION', id: 'mid', patch: { name: 'Wings', count: 3 } });
    expect(next.settings.positions[1]).toMatchObject({ id: 'mid', name: 'Wings', count: 3 });
    next = reducer(next, { type: 'UPDATE_POSITION', id: 'mid', patch: { name: '   ' } });
    expect(next.settings.positions[1].name).toBe('Wings');
  });

  it('removes a position but never the last one', () => {
    let next = reducer(base(), { type: 'REMOVE_POSITION', id: 'mid' });
    next = reducer(next, { type: 'REMOVE_POSITION', id: 'fwd' });
    expect(next.settings.positions.map(p => p.id)).toEqual(['def']);
    next = reducer(next, { type: 'REMOVE_POSITION', id: 'def' });
    expect(next.settings.positions.map(p => p.id)).toEqual(['def']);
  });

  it('changing team defaults leaves existing games alone', () => {
    const state = base();
    const next = reducer(state, { type: 'UPDATE_POSITION', id: 'def', patch: { count: 4 } });
    expect(next.games[0]).toBe(state.games[0]);
  });

  it('new games copy the current positions and rotation count', () => {
    let next = reducer(base(), { type: 'SET_ROTATION_COUNT', count: 4 });
    next = reducer(next, { type: 'UPDATE_POSITION', id: 'def', patch: { count: 3 } });
    next = reducer(next, { type: 'ADD_GAME', name: 'Rovers' });
    const game = next.games[1];
    expect(game.rotations).toHaveLength(4);
    expect(game.rotations[0].slots.def).toEqual([null, null, null]);
    expect(game.positions[0].count).toBe(3);
    expect(game.createdAt).toBeGreaterThan(next.games[0].createdAt);
  });

  it('clamps the rotation count', () => {
    expect(reducer(base(), { type: 'SET_ROTATION_COUNT', count: 0 }).settings.rotationCount).toBe(1);
    expect(reducer(base(), { type: 'SET_ROTATION_COUNT', count: 99 }).settings.rotationCount).toBe(20);
  });
});

describe('UPDATE_GAME_SETUP', () => {
  function filled() {
    const state = mkState(mkPlayers(['A']));
    state.games[0].rotations[0].slots.def = ['A', null];
    state.games[0].rotations[0].played = true;
    return state;
  }

  it('changing only the rotation count keeps the rotations already set up', () => {
    const more = reducer(filled(), { type: 'UPDATE_GAME_SETUP', gameId: 'test-game', positions: F222, rotationCount: 8 });
    expect(more.games[0].rotations).toHaveLength(8);
    expect(more.games[0].rotations[0].slots.def).toEqual(['A', null]);
    expect(more.games[0].rotations[0].played).toBe(true);

    const fewer = reducer(filled(), { type: 'UPDATE_GAME_SETUP', gameId: 'test-game', positions: F222, rotationCount: 2 });
    expect(fewer.games[0].rotations).toHaveLength(2);
    expect(fewer.games[0].rotations[0].slots.def).toEqual(['A', null]);
  });

  it('changing positions rebuilds every rotation', () => {
    const positions = F222.map(p => (p.id === 'def' ? { ...p, count: 3 } : p));
    const next = reducer(filled(), { type: 'UPDATE_GAME_SETUP', gameId: 'test-game', positions, rotationCount: 6 });
    expect(next.games[0].rotations[0].slots.def).toEqual([null, null, null]);
    expect(next.games[0].rotations[0].played).toBe(false);
    expect(next.games[0].positions[0].count).toBe(3);
  });
});

describe('REMOTE_GAMES', () => {
  it('keeps a local edit that has not been saved yet, and does not resurrect a local delete', () => {
    const state = mkState(mkPlayers(['A']));
    const local = { ...state.games[0], name: 'Local edit' };
    const deleted = { ...state.games[0], id: 'gone', createdAt: 2 };
    const fresh = { ...state.games[0], id: 'new', name: 'From another coach', createdAt: 3 };
    const next = reducer({ ...state, games: [local] }, {
      type: 'REMOTE_GAMES',
      games: [{ ...state.games[0], name: 'Server copy' }, deleted, fresh],
      pendingIds: ['test-game', 'gone'],
    });
    expect(next.games.map(g => g.name)).toEqual(['Local edit', 'From another coach']);
    expect(next.isLoaded).toBe(true);
  });
});
