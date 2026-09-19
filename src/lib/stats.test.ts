import { describe, expect, it } from 'vitest';
import { getLiveResult } from './stats';
import { mkPlayers, mkState } from '../test/fixtures';

function stateWith(ours: number, theirs: number) {
  const state = mkState(mkPlayers(['Alex', 'Taylor']));
  state.games[0].opponentScore = theirs;
  state.goals = { Alex: { 'test-game': ours } };
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
