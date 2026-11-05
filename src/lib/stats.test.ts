import { describe, expect, it } from 'vitest';
import { getCumulativeStats, getLiveResult, statsColumns } from './stats';
import { F222, mkPlayers, mkState, soccerLineup } from '../test/fixtures';

function stateWith(ours: number, theirs: number) {
  const state = mkState(mkPlayers(['Alex', 'Taylor']));
  state.games[0].opponentScore = theirs;
  state.games[0].scores = { Alex: ours };
  return state;
}

describe('getLiveResult', () => {
  it('is tied at 0-0', () => {
    expect(getLiveResult(stateWith(0, 0), 'test-game')).toEqual({ result: 'T', teamScore: 0, opponentScore: 0 });
  });

  it('is winning when we lead', () => {
    expect(getLiveResult(stateWith(4, 1), 'test-game')).toEqual({ result: 'W', teamScore: 4, opponentScore: 1 });
  });

  it('is losing when they lead', () => {
    expect(getLiveResult(stateWith(1, 4), 'test-game')).toEqual({ result: 'L', teamScore: 1, opponentScore: 4 });
  });

  it('works before the game is marked completed', () => {
    const state = stateWith(2, 0);
    expect(state.games[0].completed).toBe(false);
    expect(getLiveResult(state, 'test-game').result).toBe('W');
  });
});

describe('position stats', () => {
  it('counts rotations per position id and sums scores across games', () => {
    const state = mkState(mkPlayers(['Alex', 'Taylor']));
    const [r0, r1] = state.games[0].rotations;
    r0.slots.def = ['Alex', null];
    r1.slots.fwd = ['Alex', 'Taylor'];
    state.games[0].scores = { Alex: 2 };
    const s = getCumulativeStats(state);
    expect(s.Alex).toEqual({ byPos: { def: 1, fwd: 1 }, total: 2, score: 2 });
    expect(s.Taylor).toEqual({ byPos: { fwd: 1 }, total: 1, score: 0 });
  });

  it('keeps a column for a position an older game used after it was removed', () => {
    const state = mkState(mkPlayers(['Alex']));
    const current = soccerLineup(2, 2, 2).filter(p => p.id !== 'fwd');
    expect(statsColumns(current, state.games).map(p => p.id)).toEqual(['def', 'mid', 'fwd']);
    expect(statsColumns(F222, state.games).map(p => p.id)).toEqual(['def', 'mid', 'fwd']);
  });
});
