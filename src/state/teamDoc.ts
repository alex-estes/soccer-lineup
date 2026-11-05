import { isSportId, MAX_POSITION_COUNT, MAX_ROTATIONS, MIN_ROTATIONS, positionSkills, SPORTS } from '../constants';
import { normalizeSkills } from '../lib/skills';
import { ensureShape } from '../lib/utils';
import type { Game, Player, PositionDef, Rotation, SportId, TeamMeta, TeamSettings } from '../types';

/**
 * Readers for the v4 Firestore documents: teams/{teamId} and teams/{teamId}/games/{id}.
 * Every field is validated rather than trusted, since a document can be written by any
 * coach's copy of the app — including an older or newer version of it.
 */

export const SCHEMA_VERSION = 4;

type Raw = Record<string, unknown>;

function obj(v: unknown): Raw {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Raw) : {};
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function int(v: unknown, fallback: number, min: number, max: number): number {
  const n = typeof v === 'number' ? Math.trunc(v) : NaN;
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

function strings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

export function normalizePositions(raw: unknown, sport: SportId): PositionDef[] {
  const allowed = positionSkills(sport).map(s => s.key);
  const seen = new Set<string>();
  const out: PositionDef[] = [];
  (Array.isArray(raw) ? raw : []).forEach(item => {
    const p = obj(item);
    const id = str(p.id);
    if (!id || seen.has(id)) return;
    seen.add(id);
    const skill = str(p.skill);
    out.push({
      id,
      name: str(p.name, 'Position'),
      count: int(p.count, 1, 0, MAX_POSITION_COUNT),
      skill: allowed.includes(skill) ? skill : allowed[0] ?? '',
    });
  });
  return out.length ? out : SPORTS[sport].defaultSettings.positions.map(p => ({ ...p }));
}

export function normalizeSettings(raw: unknown, sport: SportId): TeamSettings {
  const s = obj(raw);
  const defaults = SPORTS[sport].defaultSettings;
  return {
    positions: normalizePositions(s.positions, sport),
    rotationCount: int(s.rotationCount, defaults.rotationCount, MIN_ROTATIONS, MAX_ROTATIONS),
    useSkillRatings: s.useSkillRatings !== false,
    // Absent on teams saved before the setting existed: on, like a new team.
    strongFinish: s.strongFinish !== false,
  };
}

export function normalizePlayers(raw: unknown, sport: SportId): Player[] {
  const seen = new Set<string>();
  const out: Player[] = [];
  (Array.isArray(raw) ? raw : []).forEach(item => {
    const p = obj(item);
    const name = str(p.name).trim();
    if (!name || seen.has(name)) return;
    seen.add(name);
    out.push({ name, active: p.active !== false, skills: normalizeSkills(p.skills, sport) });
  });
  return out;
}

export function normalizeTeamMeta(id: string, raw: unknown): TeamMeta {
  const d = obj(raw);
  const names = obj(d.memberNames);
  const memberNames: Record<string, string> = {};
  Object.entries(names).forEach(([uid, n]) => { if (typeof n === 'string') memberNames[uid] = n; });
  return {
    id,
    name: str(d.name, 'My Team'),
    sport: isSportId(d.sport) ? d.sport : 'soccer',
    ownerUid: str(d.ownerUid),
    memberUids: strings(d.memberUids),
    memberNames,
    joinCode: str(d.joinCode),
  };
}

export interface TeamSnapshot {
  meta: TeamMeta;
  players: Player[];
  settings: TeamSettings;
}

export function normalizeTeamDoc(id: string, raw: unknown): TeamSnapshot {
  const meta = normalizeTeamMeta(id, raw);
  const d = obj(raw);
  return {
    meta,
    players: normalizePlayers(d.players, meta.sport),
    settings: normalizeSettings(d.settings, meta.sport),
  };
}

function nameOrNull(v: unknown): string | null {
  return typeof v === 'string' && v ? v : null;
}

function normalizeRotation(raw: unknown, positions: PositionDef[]): Rotation {
  const r = obj(raw);
  const slotsIn = obj(r.slots);
  const lockedIn = obj(r.locked);
  const slots: Rotation['slots'] = {};
  const locked: Rotation['locked'] = {};
  positions.forEach(p => {
    if (Array.isArray(slotsIn[p.id])) slots[p.id] = (slotsIn[p.id] as unknown[]).map(nameOrNull);
    if (Array.isArray(lockedIn[p.id])) locked[p.id] = (lockedIn[p.id] as unknown[]).map(v => v === true);
  });
  return ensureShape({ slots, locked, bench: strings(r.bench), played: r.played === true }, positions);
}

export function normalizeGameDoc(id: string, raw: unknown, sport: SportId): Game {
  const g = obj(raw);
  const positions = normalizePositions(g.positions, sport);
  const scores: Record<string, number> = {};
  Object.entries(obj(g.scores)).forEach(([name, n]) => {
    if (typeof n === 'number' && Number.isFinite(n) && n > 0) scores[name] = Math.trunc(n);
  });
  return {
    id,
    name: str(g.name, 'Game'),
    rotations: (Array.isArray(g.rotations) ? g.rotations : []).map(r => normalizeRotation(r, positions)),
    positions,
    scores,
    opponentScore: int(g.opponentScore, 0, 0, 999),
    completed: g.completed === true,
    excludedPlayers: strings(g.excludedPlayers),
    createdAt: typeof g.createdAt === 'number' ? g.createdAt : 0,
  };
}

/** The Firestore body for a game (everything but its id, which is the document id). */
export function gameToDoc(game: Game): Omit<Game, 'id'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, ...rest } = game;
  return rest;
}
