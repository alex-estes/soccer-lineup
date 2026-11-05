// Security-rules tests: `npm run test:rules` (needs Java for the Firestore emulator).
// Not part of `npm test`/CI — run it whenever firestore.rules changes.
import { readFileSync } from 'node:fs';
import { before, after, beforeEach, test } from 'node:test';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import {
  doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, writeBatch, collection, query, where,
  arrayUnion, arrayRemove, deleteField,
} from 'firebase/firestore';

let env;
const RULES = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-lineup',
    firestore: { rules: RULES, host: '127.0.0.1', port: 8080 },
  });
});
after(() => env.cleanup());
beforeEach(() => env.clearFirestore());

const db = uid => env.authenticatedContext(uid).firestore();
const team = (d, id = 't1') => doc(d, 'teams', id);
const game = (d, id = 'g1', t = 't1') => doc(d, 'teams', t, 'games', id);
const code = (d, c = 'ABCDEFGH') => doc(d, 'joinCodes', c);

async function createTeam(owner = 'owner') {
  const d = db(owner);
  const b = writeBatch(d);
  b.set(team(d), {
    name: 'FC', sport: 'basketball', ownerUid: owner, memberUids: [owner],
    memberNames: { [owner]: 'Owner' }, joinCode: 'ABCDEFGH', players: [], settings: {},
  });
  b.set(code(d), { teamId: 't1' });
  b.set(game(d), { name: 'Rovers' });
  await assertSucceeds(b.commit());
}

async function join(uid, c = 'ABCDEFGH') {
  const d = db(uid);
  return updateDoc(team(d), { memberUids: arrayUnion(uid), [`memberNames.${uid}`]: uid, lastJoinCode: c });
}

test('owner creates a team, its code and games in one batch', async () => { await createTeam(); });

test('cannot create a team owned by someone else, or with extra members', async () => {
  const d = db('mallory');
  await assertFails(setDoc(team(d, 't2'), { ownerUid: 'owner', memberUids: ['mallory'], joinCode: 'X', sport: 'soccer' }));
  await assertFails(setDoc(team(d, 't2'), { ownerUid: 'mallory', memberUids: ['mallory', 'bob'], joinCode: 'X', sport: 'soccer' }));
});

test('cannot claim a join code for a team you do not own', async () => {
  await createTeam();
  await assertFails(setDoc(code(db('mallory'), 'ZZZZZZZZ'), { teamId: 't1' }));
});

test('outsiders cannot read the team or its games, or list codes', async () => {
  await createTeam();
  const d = db('mallory');
  await assertFails(getDoc(team(d)));
  await assertFails(getDoc(game(d)));
  await assertFails(getDocs(collection(d, 'joinCodes')));
  await assertSucceeds(getDoc(code(d)));
});

test('joining with the current code works and grants access', async () => {
  await createTeam();
  await assertSucceeds(join('coach'));
  const d = db('coach');
  await assertSucceeds(getDoc(team(d)));
  await assertSucceeds(getDocs(query(collection(d, 'teams'), where('memberUids', 'array-contains', 'coach'))));
  await assertSucceeds(getDocs(collection(d, 'teams', 't1', 'games')));
});

test('joining with a wrong code fails', async () => {
  await createTeam();
  await assertFails(join('coach', 'WRONGCOD'));
});

test('a joiner cannot add someone else or change anything else', async () => {
  await createTeam();
  const d = db('coach');
  await assertFails(updateDoc(team(d), { memberUids: arrayUnion('coach', 'friend'), lastJoinCode: 'ABCDEFGH' }));
  await assertFails(updateDoc(team(d), { memberUids: arrayUnion('coach'), lastJoinCode: 'ABCDEFGH', name: 'Hacked' }));
});

test('a coach can edit the team and games but not the code, owner, or others', async () => {
  await createTeam();
  await join('coach');
  await join('coach2');
  const d = db('coach');
  await assertSucceeds(updateDoc(team(d), { players: [{ name: 'Jo' }], name: 'New name' }));
  await assertSucceeds(updateDoc(game(d), { scores: { Jo: 2 } }));
  await assertSucceeds(setDoc(game(d, 'g2'), { name: 'United' }));
  await assertSucceeds(deleteDoc(game(d, 'g2')));
  await assertFails(updateDoc(team(d), { joinCode: 'ZZZZZZZZ' }));
  await assertFails(updateDoc(team(d), { ownerUid: 'coach' }));
  await assertFails(updateDoc(team(d), { memberUids: arrayRemove('coach2') }));
  await assertFails(updateDoc(team(d), { sport: 'soccer' }));
});

test('a coach cannot rotate the code or delete the team', async () => {
  await createTeam();
  await join('coach');
  const d = db('coach');
  const b = writeBatch(d);
  b.update(team(d), { joinCode: 'ZZZZZZZZ' });
  b.delete(code(d));
  b.set(code(d, 'ZZZZZZZZ'), { teamId: 't1' });
  await assertFails(b.commit());
  await assertFails(deleteDoc(code(d)));
  await assertFails(deleteDoc(team(d)));
});

test('a coach can leave; then loses access', async () => {
  await createTeam();
  await join('coach');
  const d = db('coach');
  await assertSucceeds(updateDoc(team(d), { memberUids: arrayRemove('coach'), 'memberNames.coach': deleteField() }));
  await assertFails(getDoc(team(d)));
  await assertFails(getDoc(game(d)));
});

test('owner removes a coach; that coach loses access', async () => {
  await createTeam();
  await join('coach');
  await assertSucceeds(updateDoc(team(db('owner')), { memberUids: arrayRemove('coach') }));
  await assertFails(getDoc(team(db('coach'))));
  await assertFails(updateDoc(game(db('coach')), { name: 'x' }));
});

test('owner cannot remove themselves or hand off ownership', async () => {
  await createTeam();
  await assertFails(updateDoc(team(db('owner')), { memberUids: arrayRemove('owner') }));
  await assertFails(updateDoc(team(db('owner')), { ownerUid: 'coach' }));
});

test('owner rotates the code: old code stops working, new one works', async () => {
  await createTeam();
  const d = db('owner');
  const b = writeBatch(d);
  b.update(team(d), { joinCode: 'NEWCODE2' });
  b.delete(code(d));
  b.set(code(d, 'NEWCODE2'), { teamId: 't1' });
  await assertSucceeds(b.commit());
  await assertFails(join('coach', 'ABCDEFGH'));
  await assertSucceeds(join('coach', 'NEWCODE2'));
});

test('owner deletes the team with its games and code in one batch', async () => {
  await createTeam();
  const d = db('owner');
  const b = writeBatch(d);
  b.delete(game(d));
  b.delete(code(d));
  b.delete(team(d));
  await assertSucceeds(b.commit());
});

test('legacy lineup is private to its owner', async () => {
  await assertSucceeds(setDoc(doc(db('alice'), 'users', 'alice', 'lineups', 'main'), { players: [] }));
  await assertFails(getDoc(doc(db('bob'), 'users', 'alice', 'lineups', 'main')));
});
