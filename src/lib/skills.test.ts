import { describe, expect, it } from 'vitest';
import {
  clampLevel, emptySkills, isLineOverCap, levelOf, lineWeakCap, lineWeakCount,
  normalizeSkills, skillLetter, tierName,
} from './skills';
import { emptyRotations } from './utils';
import { mkPlayers, F222, TWO_WEAK_DEFENDERS } from '../test/fixtures';

const DEF = F222[0];

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

describe('tierName', () => {
  it('maps levels to basketball\'s medal tiers', () => {
    expect([0, 1, 2, 3].map(tierName)).toEqual(['Unrated', 'Bronze', 'Silver', 'Gold']);
  });

  it('clamps anything out of range', () => {
    expect(tierName(-1)).toBe('Unrated');
    expect(tierName(99)).toBe('Gold');
    expect(tierName(NaN)).toBe('Unrated');
  });
});

describe('normalizeSkills', () => {
  it('fills in every key of the sport so the object is always Firestore-safe', () => {
    expect(normalizeSkills(undefined, 'soccer')).toEqual(emptySkills('soccer'));
    expect(normalizeSkills({ defense: 2 }, 'soccer')).toEqual({ ...emptySkills('soccer'), defense: 2 });
  });

  it('gives basketball overall, offense and defense ratings', () => {
    expect(emptySkills('basketball')).toEqual({ overall: 0, offense: 0, defense: 0 });
    expect(normalizeSkills({ overall: 3, defense: 1, kindness: 2 }, 'basketball'))
      .toEqual({ overall: 3, offense: 0, defense: 1 });
  });

  it('keeps a player rated before offense/defense existed, with the new two unrated', () => {
    expect(normalizeSkills({ overall: 2 }, 'basketball')).toEqual({ overall: 2, offense: 0, defense: 0 });
  });

  it('rejects junk rather than propagating it', () => {
    expect(normalizeSkills('nope', 'soccer')).toEqual(emptySkills('soccer'));
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
    rot.slots.def = ['Alex', 'Jordan']; // Alex is C, Jordan is A
    expect(lineWeakCount(players, rot, DEF)).toBe(1);

    rot.slots.def = ['Alex', 'Taylor']; // both C
    expect(lineWeakCount(players, rot, DEF)).toBe(2);

    rot.slots.def = ['Nobody', 'AlsoNobody']; // unknown names read as unrated
    expect(lineWeakCount(players, rot, DEF)).toBe(0);
  });

  it('flags a line only once it exceeds its cap', () => {
    const rot = emptyRotations(F222, 1)[0];
    rot.slots.def = ['Alex', 'Jordan'];
    expect(isLineOverCap(players, rot, DEF)).toBe(false);
    rot.slots.def = ['Alex', 'Taylor'];
    expect(isLineOverCap(players, rot, DEF)).toBe(true);
  });

  it('judges each line by the skill its position names', () => {
    expect(F222.map(p => p.skill)).toEqual(['defense', 'offense', 'offense']);
    const rot = emptyRotations(F222, 1)[0];
    rot.slots.def = ['Alex', 'Taylor'];
    // The same two players, judged on offense (unrated), are fine.
    expect(isLineOverCap(players, rot, { ...DEF, skill: 'offense' })).toBe(false);
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
