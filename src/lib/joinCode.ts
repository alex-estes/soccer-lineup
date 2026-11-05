// No I, L, O, 0 or 1 — a code read aloud or off a phone screen can't be mistyped as another.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const JOIN_CODE_LENGTH = 8;

/** 31^8 ≈ 850 billion codes: not guessable by trying them, short enough to type. */
export function generateJoinCode(random: () => number = secureRandom): string {
  let out = '';
  for (let i = 0; i < JOIN_CODE_LENGTH; i++) {
    out += ALPHABET[Math.floor(random() * ALPHABET.length)];
  }
  return out;
}

function secureRandom(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 2 ** 32;
}

/** What a coach typed → the stored code. Case, spaces and dashes don't matter. */
export function normalizeJoinCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function isValidJoinCode(code: string): boolean {
  return code.length === JOIN_CODE_LENGTH && [...code].every(c => ALPHABET.includes(c));
}

/** ABCD-EFGH, for display. */
export function formatJoinCode(code: string): string {
  return code.length === JOIN_CODE_LENGTH ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}
