# Mobile packaging notes

## Root `index.js` Metro shim

Release APK builds (`apps/mobile/android` → `assembleRelease`) resolve Metro’s
`--entry-file index.js` from the **repository root**. The root
[`index.js`](../../index.js) only re-exports `apps/mobile/index.js` so the
monorepo bundles correctly on Windows.

Do not delete that shim while Android release builds are done from this repo.
Do not put application logic in it.
