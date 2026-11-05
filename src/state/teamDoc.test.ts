import { describe, expect, it } from 'vitest';
import { gameToDoc, normalizeGameDoc, normalizeSettings, normalizeTeamDoc } from './teamDoc';
import { SPORTS } from '../constants';
import { emptyRotations } from '../lib/utils';
import { HOOPS } from '../test/fixtures';
import type { Game } from '../types';

describe('normalizeTeamDoc', () => {
  it('round-trips a well-formed basketball team', () => {
    const raw = {
      name: 'Hoopers', sport: 'basketball', ownerUid: 'u1', memberUids: ['u1', 'u2'],
      memberNames: { u1: 'Alex', u2: 'Sam' }, joinCode: 'ABCDEFGH',
      players: [{ name: 'Jo', active: true, skills: { overall: 2 } }],
      settings: { positions: HOOPS, rotationCount: 8, useSkillRatings: true },
    };
    const t = normalizeTeamDoc('t1', raw);
    expect(t.meta).toEqual({
      id: 't1', name: 'Hoopers', sport: 'basketball', ownerUid: 'u1', memberUids: ['u1', 'u2'],
      memberNames: { u1: 'Alex', u2: 'Sam' }, joinCode: 'ABCDEFGH',
    });
    expect(t.players).toEqual([{ name: 'Jo', active: true, skills: { overall: 2 } }]);
    // strongFinish wasn't stored: a team saved before that setting existed gets it on.
    expect(t.settings).toEqual({ positions: HOOPS, rotationCount: 8, useSkillRatings: true, strongFinish: true });
    expect(normalizeTeamDoc('t1', { ...raw, settings: { ...raw.settings, strongFinish: false } }).settings.strongFinish).toBe(false);
  });

  it('drops duplicate and nameless players instead of letting them collide', () => {
    const t = normalizeTeamDoc('t1', { sport: 'soccer', players: [{ name: 'Jo' }, { name: 'Jo' }, { name: '' }, 7] });
    expect(t.players.map(p => p.name)).toEqual(['Jo']);
  });

  it('falls back to soccer for an unknown sport', () => {
    expect(normalizeTeamDoc('t1', { sport: 'cricket' }).meta.sport).toBe('soccer');
  });
});

describe('normalizeSettings', () => {
  it('fills defaults for anything missing', () => {
    expect(normalizeSettings(undefined, 'basketball')).toEqual(SPORTS.basketball.defaultSettings);
  });

  it('repairs a position whose skill the sport doesn\'t have, and clamps counts', () => {
    const s = normalizeSettings({
      positions: [{ id: 'g', name: 'Guards', count: 99, skill: 'defense' }, { id: 'g', name: 'Dup', count: 1 }],
      rotationCount: 0,
    }, 'basketball');
    expect(s.positions).toEqual([{ id: 'g', name: 'Guards', count: 11, skill: 'overall' }]);
    expect(s.rotationCount).toBe(1);
  });
});

describe('game documents', () => {
  const game: Game = {
    id: 'g1', name: 'Rovers', rotations: emptyRotations(HOOPS, 2), positions: HOOPS,
    scores: { Jo: 6 }, opponentScore: 4, completed: false, excludedPlayers: ['Sam'], createdAt: 5,
  };
  game.rotations[0].slots.guard = ['Jo', null];

  it('round-trips through Firestore unchanged', () => {
    const json = JSON.parse(JSON.stringify(gameToDoc(game)));
    expect(json).not.toHaveProperty('id');
    expect(normalizeGameDoc('g1', json, 'basketball')).toEqual(game);
  });

  it('backfills slots for a position the document is missing', () => {
    const raw = { ...gameToDoc(game), rotations: [{ slots: { guard: ['Jo', null] }, bench: [], played: false }] };
    const g = normalizeGameDoc('g1', raw, 'basketball');
    expect(g.rotations[0].slots).toEqual({ guard: ['Jo', null], forward: [null, null], center: [null] });
    expect(g.rotations[0].locked.center).toEqual([false]);
  });

  it('drops junk scores', () => {
    const g = normalizeGameDoc('g1', { ...gameToDoc(game), scores: { Jo: 3, Sam: 'x', Max: -2, Kim: 0 } }, 'basketball');
    expect(g.scores).toEqual({ Jo: 3 });
  });
});
