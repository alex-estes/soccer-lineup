# Soccer Lineup

Lineup / rotation planner for youth teams — soccer and basketball. One account can
belong to many teams; several coaches can share one team.

## Data model (schema v4)

Firestore, all access enforced by `firestore.rules`:

- `teams/{teamId}` — name, sport, `ownerUid`, `memberUids`, `memberNames`,
  `joinCode`, roster (`players`) and `settings` (default positions, rotation count,
  skill toggle).
- `teams/{teamId}/games/{gameId}` — one doc per game: its own `positions` snapshot,
  `rotations` (`slots[positionId]` per rotation), per-player `scores`.
- `joinCodes/{code}` → `{ teamId }`. Joining = adding yourself to `memberUids` while
  presenting the current code; rules check it. Only the owner can rotate the code,
  remove coaches, or delete the team.
- `users/{uid}/lineups/main` — the pre-teams (v1–v3) single-document format. Read
  once on sign-in and copied into a soccer team (`migrateLegacyLineup`), then
  stamped `migratedToTeam`. Never deleted.

Sports are config, not code paths: `SPORTS` in `src/constants.ts` sets the skills,
score label and default positions. Positions are editable data (`PositionDef`), so
nothing should hardcode position ids — soccer's original `def`/`mid`/`fwd` ids are
kept only so legacy data maps onto them.

Sync (`src/hooks/useTeamSync.ts`) writes only the fields that changed, per game, and
relies on the reducer never mutating: an unchanged game/roster must stay the same
object, or it will be re-saved.

Firestore documents are validated on read (`src/state/teamDoc.ts`) — another coach
may be on an older or newer app version.

## Security rules

`firestore.rules` is in the repo but is **not** deployed by CI. After changing it,
run `npm run test:rules` (Firestore emulator, needs Java), then deploy with
`npx firebase-tools deploy --only firestore:rules --project soccer-lineup-f253e`.

To try the app against local emulators: `npx firebase-tools emulators:start --only
auth,firestore --project soccer-lineup-f253e`, then
`VITE_USE_EMULATORS=true npm run dev`.

## App version

`package.json`'s `version` field is the single source of truth for the
app version shown in Settings → Advanced (via `vite.config.ts`'s
`define: { __APP_VERSION__ }`, typed in `src/vite-env.d.ts`).

Bump it (semver) whenever a commit ships a user-facing change:
- patch — bug fixes, small tweaks
- minor — new features
- major — large redesigns / breaking changes to stored data

Do this as part of the same commit that ships the change, not
separately.

## Tests

`npm test` (Vitest, `npm run test:watch` while iterating). Specs live next
to the code as `*.test.ts`; shared fixtures are in `src/test/fixtures.ts`.
The deploy workflow runs the suite before building, so a red test blocks
the deploy.

Coverage is pure logic only — the lineup generator, the skill helpers, the
reducer, stats, join codes, Firestore document validation and the legacy
migration. No component tests yet, so there is no DOM
environment configured.

The generator depends on `Math.random`, so its tests stub it with the
seeded PRNG in the fixtures. Reseed in `beforeEach` rather than relying on
run order, so a failure is reproducible from the seed.
