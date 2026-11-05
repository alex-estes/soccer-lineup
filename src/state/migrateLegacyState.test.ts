import { describe, expect, it } from 'vitest';
import { EMPTY_LEGACY, LEGACY_DEFAULT_FORMATION, legacyHasContent, legacyToTeam, migrateLegacyState } from './migrateLegacyState';
import { emptySkills } from '../lib/skills';
import { mkPlayers } from '../test/fixtures';

const current = { ...EMPTY_LEGACY, players: mkPlayers(['Alex']) };
const EMPTY = emptySkills('soccer');

/**
 * This function rebuilds every Player from scratch, so any field it forgets to copy is
 * silently erased. These tests pin that down.
 */
describe('player skills survive migration', () => {
  it('carries skills through unchanged', () => {
    const stored = {
      players: [{ name: 'Alex', active: true, skills: { defense: 1, offense: 3, teamwork: 2, kindness: 0 } }],
    };
    const { players } = migrateLegacyState(stored, current);
    expect(players[0].skills).toEqual({ defense: 1, offense: 3, teamwork: 2, kindness: 0 });
  });

  it('gives a player stored before ratings existed a complete, unrated skills object', () => {
    const { players } = migrateLegacyState({ players: [{ name: 'Alex', active: true }] }, current);
    expect(players[0].skills).toEqual(EMPTY);
  });

  it('handles the oldest shape, where a player was just a name string', () => {
    const { players } = migrateLegacyState({ players: ['Alex'] }, current);
    expect(players[0]).toEqual({ name: 'Alex', active: true, skills: EMPTY });
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
    const { settings } = migrateLegacyState({ settings: { defaultFormation: LEGACY_DEFAULT_FORMATION } }, current);
    expect(settings.useSkillRatings).toBe(true);
  });

  it('is only off when explicitly stored as false', () => {
    const stored = { settings: { defaultFormation: LEGACY_DEFAULT_FORMATION, useSkillRatings: false } };
    expect(migrateLegacyState(stored, current).settings.useSkillRatings).toBe(false);
  });

  it('survives a document with no settings key at all', () => {
    expect(migrateLegacyState({}, current).settings.useSkillRatings).toBe(true);
  });
});

// ── v3 → v4 ──

const V3_DOC = {
  schemaVersion: 3,
  players: [
    { name: 'Alex', active: true, skills: { defense: 1, offense: 3, teamwork: 2, kindness: 0 } },
    { name: 'Taylor', active: false },
  ],
  goals: { Alex: { g1: 2, g2: 1 }, Taylor: { g1: 0 } },
  settings: { defaultFormation: { playersOnField: 5, defenders: 3, midfielders: 1, forwards: 1 }, useSkillRatings: false },
  games: [
    {
      id: 'g1', name: 'Rovers', opponentScore: 1, completed: true, excludedPlayers: ['Taylor'],
      formation: { playersOnField: 6, defenders: 2, midfielders: 2, forwards: 2 },
      rotations: [{
        def: ['Alex', null], mid: [null, null], fwd: [null, null], bench: ['Taylor'], played: true,
        locked: { def: [true, false], mid: [false, false], fwd: [false, false] },
      }],
    },
    {
      id: 'g2', name: 'United', opponentScore: 0, completed: false, excludedPlayers: [],
      formation: { playersOnField: 5, defenders: 3, midfielders: 1, forwards: 1 },
      rotations: [],
    },
  ],
};

describe('legacyToTeam (v3 document → soccer team)', () => {
  const team = legacyToTeam(V3_DOC, 1000);

  it('keeps the roster, ratings and settings', () => {
    expect(team.players.map(p => p.name)).toEqual(['Alex', 'Taylor']);
    expect(team.players[0].skills.offense).toBe(3);
    expect(team.players[1].active).toBe(false);
    expect(team.settings.useSkillRatings).toBe(false);
    expect(team.settings.positions.map(p => [p.id, p.name, p.count, p.skill])).toEqual([
      ['def', 'Defenders', 3, 'defense'],
      ['mid', 'Midfielders', 1, 'offense'],
      ['fwd', 'Forwards', 1, 'offense'],
    ]);
  });

  it('turns each game\'s formation into its own positions', () => {
    expect(team.games[0].positions.map(p => p.count)).toEqual([2, 2, 2]);
    expect(team.games[1].positions.map(p => p.count)).toEqual([3, 1, 1]);
  });

  it('moves rotations onto slot maps without losing a name or a lock', () => {
    expect(team.games[0].rotations[0]).toEqual({
      slots: { def: ['Alex', null], mid: [null, null], fwd: [null, null] },
      locked: { def: [true, false], mid: [false, false], fwd: [false, false] },
      bench: ['Taylor'],
      played: true,
    });
  });

  it('moves goals onto each game, dropping zeros', () => {
    expect(team.games[0].scores).toEqual({ Alex: 2 });
    expect(team.games[1].scores).toEqual({ Alex: 1 });
  });

  it('keeps game order, results and exclusions', () => {
    expect(team.games.map(g => [g.id, g.name, g.createdAt, g.opponentScore, g.completed])).toEqual([
      ['g1', 'Rovers', 1000, 1, true],
      ['g2', 'United', 1001, 0, false],
    ]);
    expect(team.games[0].excludedPlayers).toEqual(['Taylor']);
  });

  it('uses the stored number of rotations as the team default', () => {
    expect(team.settings.rotationCount).toBe(1);
    expect(legacyToTeam({ players: ['A'] }).settings.rotationCount).toBe(6);
  });

  it('migrates index-keyed goals from the oldest documents', () => {
    const old = { players: ['Alex'], games: [{ name: 'Rovers', rotations: [] }], goals: { Alex: { 0: 4 } } };
    expect(legacyToTeam(old).games[0].scores).toEqual({ Alex: 4 });
  });
});

describe('legacyHasContent', () => {
  it('skips a document with nothing in it', () => {
    expect(legacyHasContent({})).toBe(false);
    expect(legacyHasContent({ players: [], games: [] })).toBe(false);
    expect(legacyHasContent(V3_DOC)).toBe(true);
  });
});
