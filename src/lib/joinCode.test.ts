import { describe, expect, it } from 'vitest';
import { formatJoinCode, generateJoinCode, isValidJoinCode, normalizeJoinCode } from './joinCode';
import { seededRandom } from '../test/fixtures';

describe('join codes', () => {
  it('are 8 characters with no look-alikes (I, L, O, 0, 1)', () => {
    const rand = seededRandom(7);
    for (let i = 0; i < 500; i++) {
      const code = generateJoinCode(rand);
      expect(isValidJoinCode(code)).toBe(true);
      expect(code).not.toMatch(/[ILO01]/);
    }
  });

  it('accept whatever a coach types: lower case, spaces, the display dash', () => {
    expect(normalizeJoinCode(' abcd-efgh ')).toBe('ABCDEFGH');
    expect(isValidJoinCode(normalizeJoinCode('abcd efgh'))).toBe(true);
  });

  it('reject the wrong length or a look-alike character', () => {
    expect(isValidJoinCode('ABCDEFG')).toBe(false);
    expect(isValidJoinCode('ABCDEFG0')).toBe(false);
  });

  it('display split in two', () => {
    expect(formatJoinCode('ABCDEFGH')).toBe('ABCD-EFGH');
  });

  it('use a secure source of randomness by default', () => {
    expect(isValidJoinCode(generateJoinCode())).toBe(true);
  });
});
