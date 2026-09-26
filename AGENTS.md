# Omnis Vir Lupus: agent guide

This guide applies to this repository. Pixel Pals is a separate sibling
repository; do not change its code or real player saves while working here.
Read `README.md`, `docs/player-guide.md`, and `docs/verification.md` first.
The initial sibling review is recorded in `docs/pixel-pals-review.md`.

## Working conventions

- Preserve the complete fan RPG scope: three origins, Red’s Carving,
  converging narrative, care, eight phases, level 80, equipment, complete
  campaign, tactical combat, responsive browser play, and portable saves.
- Use small focused patches, approximately 100 lines or fewer, with targeted
  checks. This avoids the interrupted broad-edit workflow encountered earlier.
- TypeScript is strict, two-space indentation, ES modules, `.ts` imports.
  Pure game modules must also execute using Node’s type stripping.
- Keep game rules independent of Phaser and DOM. Animation presents a
  committed result; it never decides damage, spending, or rewards.
- Preserve original artwork, original story text, free dependencies, and
  local assets. Do not add accounts, paid APIs, telemetry, or a backend.
- Keep attribution and license notices. Do not include book excerpts,
  official artwork, or sprites or audio from commercial games.
- Do not claim AAA production quality, a formal age rating, or measured
  playtime based solely on automated tests or content counts.

## File map

```text
src/
  main.ts                    Application state, screen rendering, bootstrap.
  audio.ts                   Optional synthesized music and effects.
  styles.css                 Ordered stylesheet imports; base defaults first.
  styles/                    Base tokens, layout, welcome, camp, collections, combat, mobile.
  game/
    types.ts                 Persisted domain model and combat events.
    math.ts                  Seeded randomness, clamps, formatting.
    state.ts                 Care, XP, equipment, progression, achievements.
    combat.ts                Atomic turns, intentions, breaks, rewards, recovery.
    storage.ts               Validation, checksum envelopes, backup and conflict handling.
  data/
    origins.ts               Origins, companions, needs, eight life phases.
    chapters.ts              Sixteen chapter outlines, objectives, opponents.
    story.ts                 Origin scenes, choices, mission nodes, endings, patrols.
    abilities.ts             Level requirements, elements, attacks, recovery.
    items.ts                 Equipment, consumables, forge materials, shop prices.
    enemies.ts               Forty regular enemies and sixteen bosses.
  render/
    pixel.ts                 Integer drawing primitives and seeded texture.
    landscape.ts             Nine layered pixel environments.
    sprites.ts               Hero ages, equipment, companions, enemies, item art.
    effects.ts               Element-specific combat geometry.
    scene.ts                 One Phaser instance, actors, input, camera, effects.
  ui/
    icons.ts                 Original SVG interface icons.
    kit.ts                   Escaping, buttons, meters, native dialogs, notices.
    screens.ts               Game screen HTML; no game mutations.
    welcome.ts               Title, origin selection, prologue, guide, credits.
    actions.ts               Click queue and delegated action routing.
    start.ts                 Character creation and loading.
    session.ts               Draft mutations and serialized durable writes.
    camp-actions.ts          Care, companions, inventory, quartermaster, forge.
    story-actions.ts         Expeditions, choices, chapter rewards and endings.
    battle-actions.ts        Commands, presentation, victory and recovery.
    save-actions.ts          File export/import and checkpoint restoration.
    preferences.ts           Saved settings and keyboard shortcuts.
    lifecycle.ts             Active playtime, visibility and cross-tab notices.
    cinematic.ts             Skippable opening sequence.
    offline.ts               Service worker registration and update prompt.
tests/
  game.test.ts               Domain, reward, save, corruption and conflict checks.
  browser/                   Gameplay, progression, offline, accessibility, rendering.
tools/
  build-sw.mjs               Hashes and precaches every built asset.
  make-icons.mjs             Rasterizes the original wolf SVG.
  serve-dist.mjs             Importable production server; CLI uses port 5174.
  serve-dist.d.mts           Type declaration for the shared test server.
  simulate-campaign.ts      Tactical policy and campaign save-round-trip traversal.
  verify-campaign.ts        All origins/difficulties/endings, eight phases, level 80.
  capture.ts                Desktop/phone reference captures and a late-game spell.
public/                      Manifest, wolf SVG, install icons, runtime license notices.
docs/                        Review, player guide, verification, design, screenshots.
.github/workflows/game.yml   Checks, campaign traversal, browser tests, Pages publishing.
```

## Checks and publishing

```sh
npm ci
npm run check
npm run test:balance
npx playwright install chromium
npm run test:browser
```

Browser tests use isolated profiles, not existing user data. System Chromium
is used when present; otherwise Playwright’s downloaded Chromium is used.
`PLAYWRIGHT_CHROMIUM_EXECUTABLE` can select a browser explicitly.
CI runs the suite on Chromium, Firefox, and WebKit. Set `OVL_ALL_BROWSERS=1`
locally to enable those projects after installing the additional browsers.
Generated reports are in ignored `tools/out/`, `test-results/`, and
`playwright-report/`. Inspect actual screenshots after visual changes.
Traces retain DOM snapshots, source and actions; failure screenshots are
captured separately to avoid continuous GPU readback during long encounters.
Publish only `dist/`. Source modules and test fixtures are never deployed.

## Persistence and UI changes

Use `change(app, edit)` for ordinary game mutations. Use `save` under its
Web Lock for an explicitly confirmed replacement. Never mutate live state
before validating an import or command, and never claim that a failed
storage write succeeded. The in-memory state must remain exportable.

Every rendered choice, inventory transaction, or combat command needs an
accessible HTML control; essential gameplay cannot exist only on the canvas.
When replacing screen HTML, retain keyboard focus where appropriate and
reuse the single renderer. Put base CSS before component and responsive
styles. Keep reduced-motion behavior in both CSS and Phaser presentation.
Keep clicks and keyboard shortcuts responsive during background saves;
discard queued controls that belong to a screen already replaced.
Pause and resume scene systems before sleeping or waking the render loop;
queued scene operations need another frame to run. Care effects must not
discard camp interaction commands.

Review `git diff --check` and the working tree before committing. Update this
map when adding files, and report known limits instead of implying that a
passing test covers an untested device, production service, or human metric.
