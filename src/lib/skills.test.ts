import { describe, expect, it } from 'vitest';
import {
  clampLevel, EMPTY_SKILLS, isLineOverCap, levelOf, lineWeakCap, lineWeakCount,
  normalizeSkills, POSITION_SKILL, skillLetter,
} from './skills';
import { emptyRotations } from './utils';
import { mkPlayers, F222, TWO_WEAK_DEFENDERS } from '../test/fixtures';

describe('skillLetter', () => {
  it('maps levels to the letters the design shows', () => {
    expect([0, 1, 2, 3].map(skillLetter)).toEqual(['–', 'C', 'B', 'A']);
  });

  it('clamps anything out of range instead of rendering undefined', () => {
    expect(skillLetter(-1)).toBe('–');
    expect(skillLetter(99)).toBe('A');
    expect(skillLetter(NaN)).toBe('–');
  });
});

describe('normalizeSkills', () => {
  it('fills in every key so the object is always Firestore-safe', () => {
    expect(normalizeSkills(undefined)).toEqual(EMPTY_SKILLS);
    expect(normalizeSkills({ defense: 2 })).toEqual({ ...EMPTY_SKILLS, defense: 2 });
  });

  it('rejects junk rather than propagating it', () => {
    expect(normalizeSkills('nope')).toEqual(EMPTY_SKILLS);
    expect(clampLevel('C')).toBe(0);
    expect(clampLevel(2.7)).toBe(2);
  });
});

describe('lineWeakCap', () => {
  it('generalises across formations instead of hardcoding "no two C\'s"', () => {
    // A lone forward may be weak; two defenders may not both be.
    expect([1, 2, 3, 4, 5].map(lineWeakCap)).toEqual([1, 1, 1, 2, 2]);
  });
});

describe('line inspection', () => {
  const players = mkPlayers(undefined, TWO_WEAK_DEFENDERS);

  it('counts only explicit C ratings — unrated is neutral, never weak', () => {
    const rot = emptyRotations(F222, 1)[0];
    rot.def = ['Alex', 'Jordan']; // Alex is C, Jordan is A
    expect(lineWeakCount(players, rot, 'def')).toBe(1);

    rot.def = ['Alex', 'Taylor']; // both C
    expect(lineWeakCount(players, rot, 'def')).toBe(2);

    rot.def = ['Nobody', 'AlsoNobody']; // unknown names read as unrated
    expect(lineWeakCount(players, rot, 'def')).toBe(0);
  });

  it('flags a line only once it exceeds its cap', () => {
    const rot = emptyRotations(F222, 1)[0];
    rot.def = ['Alex', 'Jordan'];
    expect(isLineOverCap(players, rot, 'def')).toBe(false);
    rot.def = ['Alex', 'Taylor'];
    expect(isLineOverCap(players, rot, 'def')).toBe(true);
  });

  it('judges each line by its governing skill', () => {
    expect(POSITION_SKILL).toEqual({ def: 'defense', mid: 'offense', fwd: 'offense' });
  });
});

describe('levelOf', () => {
  const players = mkPlayers(['Alex'], { Alex: 2 });

  it('reads the requested skill', () => {
    expect(levelOf(players, 'Alex', 'defense')).toBe(2);
  });

  it('treats a deleted player still sitting in a locked slot as unrated', () => {
    expect(levelOf(players, 'Ghost', 'defense')).toBe(0);
    expect(levelOf(players, null, 'defense')).toBe(0);
  });
});
