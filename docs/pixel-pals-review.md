# Pixel Pals review

Reviewed 26 September 2026, beginning with the repository's `AGENTS.md`.
Pixel Pals was inspected without changing its repository or any player saves.
The browser checks run against a disposable copy in `/tmp`.

## Assessment

Pixel Pals is a coherent, small virtual pet game. Its separation of pet rules,
content generators, rendering, and persistence is the strongest foundation to
carry forward. Its approachable five-action loop, responsive touch controls,
bundled fonts, procedural sound, and complete local save export are well matched
to its intended child audience. Its six growth stages deliberately span weeks.

It is not an RPG engine. The educational reward system, calendar gates, small
sprite vocabulary, portrait-only composition, and absence of combat, narrative
state, or statistical equipment make a separate implementation appropriate for
Omnis Vir Lupus. The new game should preserve the simplicity of device-local
play, while using an actual scene framework and a validated game-state model.

## Findings

### High: cloud lease operations can revert a newer save

`infra/api/logic.mjs`, `createService().open()` and `release()`, read a whole
profile and then write it back with unconditional `db.put(updated)`. Acquiring
or dropping a lease can therefore overwrite a newer profile written between
those two operations, including reverting its version number. This is not
prevented by the version condition used in the separate `save()` path.

A deterministic check paused `open()` after its read, saved new data at version
2, then resumed `open()`. The stored record reverted to version 1 and its old
data. A second check ran two opens concurrently against an unleased profile:
both returned HTTP 200.

Recommended fix: update only lease fields atomically, condition lease
acquisition on the current owner/expiry, and make release conditional on
ownership. Test interleavings between acquire, refresh, save, release, and
takeover with the actual adapter contract. The existing tests exercise
sequential calls and do not cover these races.

### High: a local save failure is hidden from the player

`src/storage.js` returns `false` when persistent storage fails, then uses a
memory fallback. `src/store.js` discards this result in local `save()`,
`create()`, `remove()`, and import. The app consequently sees a successful
operation even when quota or privacy restrictions prevent durable saving.

Reproduced with a storage adapter whose `setItem()` throws: `saveState()`
returned `false`, while `createLocalStore().save()` resolved normally.
Additionally, if an old persistent value exists, `loadState()` prefers it over
the newer memory fallback. A reload can silently restore stale progress.

Recommended fix: surface a durable-save status, keep export available when
writes fail, preserve a previous valid save, and test quota and blocked-storage
paths. Omnis Vir Lupus needs this before adding a long campaign.

### Medium: backup validation accepts an unusable profile

`src/storage.js`, `importJSON()` and `migrateProfile()`, only validate the
top-level profiles array. An import containing `{ "profiles": [{ "pet": null }]
}` is accepted, but later screens dereference `pet.stage` and `pet.species`.
Null skills/profiles throw incidental TypeErrors instead of a useful format
error. Numeric bounds, supported species, known inventory IDs, and schema
versions are not validated.

Recommended fix: validate before replacing current state; reject unsupported
versions and malformed profiles, and clamp only fields where that is an
explicit migration rule. A successful JSON parse is not sufficient.

### Medium: replacing the home screen does not dispose its animation loop

`src/main.js`, `app.go()`, clears `app.home` and replaces the screen without
calling the previous home's `setPaused(true)` or a cleanup function.
`src/screens/home.js` does not register root cleanup. `src/scene.js` owns a
self-scheduling animation frame loop that stops only when its internal
`running` flag becomes false.

Switching profiles can leave the old, detached canvas rendering indefinitely.
Every subsequent home can add another loop, with shared profile callbacks.
This follows directly from the lifecycle paths; a CPU-profile measurement was
not used to quantify its performance impact.

Recommended fix: make base-screen disposal explicit and idempotent, and cancel
timers, animation frames, and pending scene actions on disposal.

### Medium: offline cache maintenance is not isolated to this app

`sw.js` deletes every cache whose name differs from `pixelpals-v1` during
activation. Cache Storage belongs to an origin, so this can remove caches of
other apps hosted under sibling paths on the same origin. Its constant version
also does not reliably distinguish successive GitHub Pages releases.

Recommended fix: namespace caches by app and deployment scope, version the
precache from build content, clean up only this app's caches, and verify
subpath hosting and an offline reload after an update.

### Medium: several controls cannot be operated with a keyboard

Profile cards, memory cards, and switches are clickable `div` elements without
keyboard handlers or appropriate focus behavior. Dialogs lack focus containment
and focus restoration. The viewport disables user zoom. Need bars have no
accessible textual values.

Recommended fix: use native buttons/inputs, label meters, allow browser zoom,
and use accessible dialogs. Keep a semantic DOM interface around the canvas in
the new game.

### Low: development tools are not reproducibly installed

`package.json` does not declare ESLint or Playwright; `npm install` alone does
not supply the documented development tools. The browser helper tries several
machine-specific global locations, and CI obtains ESLint from an unpinned
network invocation. The generated tests are useful, but their random inputs
also make a rare failure harder to replay.

Recommended fix: pin development tools in a lockfile, use seeded randomness in
rule tests, and run browser smoke checks in CI along with unit checks.

## What was reviewed

- Entry, routing, timer lifecycle, needs, mood, growth, badges, audio and speech.
- Profile creation, local migration/import/export, cloud abstraction, auth/API,
  Lambda adapter, lease service, infrastructure and deployment script.
- All screen types, care and lesson completion paths, shop and album behavior.
- Lesson-generation structure, adaptive selection, three minigame loops.
- Sprite construction, room renderer, styles, HTML accessibility, manifest,
  service worker, CI, test scripts and existing reference screenshots.
- Existing unit tests and targeted malformed-save, failed-storage, and
  concurrent-lease reproductions.

Cloud production deployment, live Cognito, IAM, and DynamoDB were not exercised.
The mock checks cannot establish production cloud correctness.

### Check results and isolation

The sibling working tree was clean at the final inspection; its observed
head was `08cdb0550b182b84c5fdfdc37d654422159f436c`.
No fixes were applied there as part of the new game.

| Check | Result and scope |
| --- | --- |
| Existing Node tests | Passed: pet rules, lesson content, cloud service tests |
| Browser gameplay | Passed in the disposable copy: profiles, care, lessons, rooms, shop and album |
| Mock cloud flow | Passed: sign-in, two clients, in-use profile and takeover |
| Backup transfer | Passed: exported save restored in an isolated browser profile |
| Concurrent lease reproductions | Confirmed the lost-update and simultaneous-open findings above |
| Local save failures and malformed imports | Confirmed the reporting and validation gaps above |

The disposable copy was `/tmp/ovl-pixel-pals-review`. Its Playwright helper
was pointed at the available local Chromium installation; game source,
cloud rules, and test scenarios were preserved. Generated browser captures
remain under that copy’s `tools/out/`. This is evidence for the mock and
local flows, not a claim about deployed AWS services.

## Implications for Omnis Vir Lupus

Use pure, seeded game rules with a typed state model. Let a scene framework own
rendering and animation lifecycle. Give campaign missions explicit states and
idempotent rewards. Persist at every committed action, including combat turns;
validate backups before touching active progress. Keep offline caching scoped
to the app. Make ordinary controls work with touch, keyboard, and screen
readers. Use original art and audio, pin the free development dependencies, and
ship only built game assets to static hosting.

The requested AAA quality is a production ambition, not a property that a
framework, a large content count, or automated tests can establish. Likewise,
campaign duration needs human playtesting; it must be identified as a pacing
target until measured.
