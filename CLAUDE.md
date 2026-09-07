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
