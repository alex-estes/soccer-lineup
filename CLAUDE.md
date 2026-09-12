# Soccer Lineup

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

Coverage is pure logic only — the lineup generator, the skill helpers, and
the Firestore migration. No component tests yet, so there is no DOM
environment configured.

The generator depends on `Math.random`, so its tests stub it with the
seeded PRNG in the fixtures. Reseed in `beforeEach` rather than relying on
run order, so a failure is reproducible from the seed.
