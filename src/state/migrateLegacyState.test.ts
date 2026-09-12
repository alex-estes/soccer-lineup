import { describe, expect, it } from 'vitest';
import { migrateLegacyState } from './migrateLegacyState';
import { initialState } from './reducer';
import { EMPTY_SKILLS } from '../lib/skills';
import { mkPlayers, mkState } from '../test/fixtures';

const current = mkState(mkPlayers(['Alex']));

/**
 * This function rebuilds every Player from scratch on each Firestore snapshot, so any
 * field it forgets to copy is silently erased — the failure shows up as a rating that
 * saves and then vanishes a moment later. These tests pin that down.
 */
describe('player skills survive a Firestore round trip', () => {
  it('carries skills through unchanged', () => {
    const stored = {
      players: [{ name: 'Alex', active: true, skills: { defense: 1, offense: 3, teamwork: 2, kindness: 0 } }],
    };
    const { players } = migrateLegacyState(stored, current);
    expect(players[0].skills).toEqual({ defense: 1, offense: 3, teamwork: 2, kindness: 0 });
  });

  it('gives a player stored before this feature a complete, unrated skills object', () => {
    const { players } = migrateLegacyState({ players: [{ name: 'Alex', active: true }] }, current);
    expect(players[0].skills).toEqual(EMPTY_SKILLS);
  });

  it('handles the oldest shape, where a player was just a name string', () => {
    const { players } = migrateLegacyState({ players: ['Alex'] }, current);
    expect(players[0]).toEqual({ name: 'Alex', active: true, skills: EMPTY_SKILLS });
  });

  it('never emits undefined, which Firestore would reject on the next write', () => {
    const { players } = migrateLegacyState({ players: [{ name: 'Alex', skills: { defense: 'nonsense' } }] }, current);
    expect(Object.values(players[0].skills).every(v => typeof v === 'number')).toBe(true);
    expect(players[0].skills.defense).toBe(0);
  });

  it('clamps out-of-range levels rather than trusting the document', () => {
    const { players } = migrateLegacyState({ players: [{ name: 'Alex', skills: { defense: 99, offense: -5 } }] }, current);
    expect(players[0].skills.defense).toBe(3);
    expect(players[0].skills.offense).toBe(0);
  });

  it('still preserves name and active, which it always did', () => {
    const { players } = migrateLegacyState({ players: [{ name: 'Alex', active: false }] }, current);
    expect(players[0].name).toBe('Alex');
    expect(players[0].active).toBe(false);
  });
});

describe('useSkillRatings setting', () => {
  it('reads as on for a document written before the feature existed', () => {
    const { settings } = migrateLegacyState({ settings: { defaultFormation: initialState.settings.defaultFormation } }, current);
    expect(settings.useSkillRatings).toBe(true);
  });

  it('is only off when explicitly stored as false', () => {
    const stored = { settings: { defaultFormation: initialState.settings.defaultFormation, useSkillRatings: false } };
    expect(migrateLegacyState(stored, current).settings.useSkillRatings).toBe(false);
  });

  it('survives a document with no settings key at all', () => {
    expect(migrateLegacyState({}, current).settings.useSkillRatings).toBe(true);
  });

  it('keeps the stored formation alongside it', () => {
    const formation = { playersOnField: 5, defenders: 3, midfielders: 1, forwards: 1 };
    const { settings } = migrateLegacyState({ settings: { defaultFormation: formation, useSkillRatings: false } }, current);
    expect(settings.defaultFormation).toEqual(formation);
    expect(settings.useSkillRatings).toBe(false);
  });
});
