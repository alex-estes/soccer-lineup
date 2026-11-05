import {
  arrayRemove, arrayUnion, collection, deleteField, doc, getDoc, getDocs, runTransaction,
  updateDoc, writeBatch, type DocumentData, type DocumentReference,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from './firebaseConfig';
import { generateJoinCode, isValidJoinCode, normalizeJoinCode } from './joinCode';
import { SPORTS } from '../constants';
import { legacyHasContent, legacyToTeam, type LegacyDoc } from '../state/migrateLegacyState';
import { gameToDoc, SCHEMA_VERSION } from '../state/teamDoc';
import type { Game, Player, SportId, TeamMeta, TeamSettings } from '../types';

// ── Document references ─────────────────────────────────────────────────────

export const teamsCol = () => collection(db, 'teams');
export const teamRef = (teamId: string) => doc(db, 'teams', teamId);
export const gamesCol = (teamId: string) => collection(db, 'teams', teamId, 'games');
export const gameRef = (teamId: string, gameId: string) => doc(db, 'teams', teamId, 'games', gameId);
export const joinCodeRef = (code: string) => doc(db, 'joinCodes', code);
/** Where everything lived before teams (schema v1–v3). Read once to migrate, never written to again except to mark it migrated. */
export const legacyLineupRef = (uid: string) => doc(db, 'users', uid, 'lineups', 'main');

export function coachName(user: User): string {
  return user.displayName || user.email || 'Coach';
}

// ── Creating a team ─────────────────────────────────────────────────────────

interface TeamContent {
  players: Player[];
  settings: TeamSettings;
  games: Game[];
}

/** A batch's or a transaction's `set`, so team creation can run inside either. */
type SetFn = (ref: DocumentReference, data: DocumentData) => void;

function writeNewTeam(
  set: SetFn,
  user: User,
  name: string,
  sport: SportId,
  content: TeamContent,
): string {
  const teamId = crypto.randomUUID();
  const joinCode = generateJoinCode();
  set(teamRef(teamId), {
    name,
    sport,
    ownerUid: user.uid,
    memberUids: [user.uid],
    memberNames: { [user.uid]: coachName(user) },
    joinCode,
    players: content.players,
    settings: content.settings,
    schemaVersion: SCHEMA_VERSION,
    createdAt: Date.now(),
  });
  set(joinCodeRef(joinCode), { teamId });
  content.games.forEach(g => set(gameRef(teamId, g.id), gameToDoc(g)));
  return teamId;
}

export async function createTeam(user: User, name: string, sport: SportId): Promise<string> {
  const batch = writeBatch(db);
  const id = writeNewTeam((ref, data) => { batch.set(ref, data); }, user, name.trim() || 'My Team', sport, {
    players: [],
    settings: SPORTS[sport].defaultSettings,
    games: [],
  });
  await batch.commit();
  return id;
}

/**
 * Copies a pre-teams lineup into a new soccer team, once. Run in a transaction that
 * also stamps the old document, so two open tabs can't both migrate it. The old document
 * is left in place (only marked) as a safety net.
 */
export async function migrateLegacyLineup(user: User): Promise<string | null> {
  const ref = legacyLineupRef(user.uid);
  return runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return null;
    const data = snap.data() as LegacyDoc;
    if (data.migratedToTeam || !legacyHasContent(data)) return null;
    const teamId = writeNewTeam((r, d) => { tx.set(r, d); }, user, 'My Soccer Team', 'soccer', legacyToTeam(data));
    tx.update(ref, { migratedToTeam: teamId });
    return teamId;
  });
}

// ── Coaches ─────────────────────────────────────────────────────────────────

export class JoinError extends Error {}

/** Adds the signed-in coach to the team behind `input`. Returns the team id. */
export async function joinTeam(user: User, input: string): Promise<string> {
  const code = normalizeJoinCode(input);
  if (!isValidJoinCode(code)) throw new JoinError('That code should be 8 letters and numbers.');
  const snap = await getDoc(joinCodeRef(code));
  const teamId = snap.exists() ? (snap.data().teamId as string | undefined) : undefined;
  if (!teamId) throw new JoinError('No team has that code. Ask the team owner for the current one.');
  // The security rules let a non-member make exactly this change, and only when
  // `lastJoinCode` matches the team's current code.
  await updateDoc(teamRef(teamId), {
    memberUids: arrayUnion(user.uid),
    [`memberNames.${user.uid}`]: coachName(user),
    lastJoinCode: code,
  });
  return teamId;
}

/** Owner removing a coach, or a coach leaving. */
export async function removeMember(teamId: string, uid: string): Promise<void> {
  await updateDoc(teamRef(teamId), {
    memberUids: arrayRemove(uid),
    [`memberNames.${uid}`]: deleteField(),
  });
}

/** Owner only. The old code stops working immediately; existing coaches stay. */
export async function regenerateJoinCode(team: TeamMeta): Promise<void> {
  const next = generateJoinCode();
  const batch = writeBatch(db);
  batch.update(teamRef(team.id), { joinCode: next });
  if (team.joinCode) batch.delete(joinCodeRef(team.joinCode));
  batch.set(joinCodeRef(next), { teamId: team.id });
  await batch.commit();
}

/** Owner only. Deletes every game, the join code and the team, in one batch. */
export async function deleteTeam(team: TeamMeta): Promise<void> {
  const games = await getDocs(gamesCol(team.id));
  const batch = writeBatch(db);
  games.forEach(g => batch.delete(g.ref));
  if (team.joinCode) batch.delete(joinCodeRef(team.joinCode));
  batch.delete(teamRef(team.id));
  await batch.commit();
}
