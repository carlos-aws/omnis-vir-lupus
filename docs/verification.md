# Verification and remaining limits

This document distinguishes implemented features from the checks that
exercise them. Source, tests, captures, and actual deployment results are
the evidence; content counts alone do not establish production quality.

## Feature evidence

| Requirement | Implementation | Evidence |
| --- | --- | --- |
| Review Pixel Pals first | Sibling code, tests, storage, cloud, lifecycle, accessibility and deployment review | [Review and findings](pixel-pals-review.md) |
| Free, open-source browser game | Phaser, TypeScript, native HTML/CSS, local fonts, original art and audio | Lockfile, runtime notices, static production build |
| Three origins and merged narrative | Origin scenes through Chapter 3; convergence in Chapter 4 | Content invariants and campaign traversal for all origins |
| Red becomes a Gold | Carving at `c03-m4`; appearance changes, origin retained | Browser Carving test and campaign assertions |
| Character care | Six rituals and four needs; bounded offline decay | Domain and browser care checks |
| Eight growth phases | Eight level/age bands and distinct pixel details | Domain thresholds; 8 distinct images per origin in browser |
| Level 80 | XP cap, main-story progression, repeatable endgame patrols | Nine difficulty/origin runs reach 80 |
| Substantial main story | 16 chapters, 64 operations, 256 encounters, three endings | Full domain traversal; real browser operation and ending flows |
| Tactical turn battles | Intentions, weaknesses, shields, Burst, five elements, conditions, companions | Determinism, invalid-action, break, reward and browser combat checks |
| Opponent variety | 40 regular enemies, 16 bosses, seven sprite families | Data integrity and complete campaign traversal |
| Abilities and equipment | 19 definitions, 46 equipment pieces, consumables, materials and forging | Level checks; browser purchase/equip/forge and appearance test |
| Pixel intro | Five animated scenes with a skip control and keyboard support | Intro/create browser flow and visual inspection |
| Local saves and export | Versioned validated envelope, prior checkpoint, cross-tab protection | Round trips, reload during battle, corrupt imports, quota failure, stale tabs, input during autosave |
| Offline play | Complete release cache scoped to this site | Production reload with the server stopped; save-before-update and failed-save recovery |
| Responsive screens | Touch controls, narrow layouts, desktop shortcuts | 320, 390, 768, 1024 and 1920px checks; camp keyboard interaction after menu visits |
| Accessibility preferences | Native controls/dialogs, focus retention, reduced motion and larger text | axe checks, keyboard flow and settings persistence |
| Mature audience | Fictional violence, oppression, grief, and non-graphic Carving | Story and credits; intended 16+, not an official classification |
| Fan-game attribution | Pierce Brown and rights-holder credit; original assets distinguished | README, in-game credits, third-party notices |

## Reproduce the checks

```sh
npm ci
npm run check
npm run test:balance
npx playwright install chromium
npm run test:browser
```

The browser suite uses disposable profiles and local test servers.
`npm run test:browser` first builds the production release. Its offline test
serves that build beneath `/omnis-vir-lupus/`, rather than relying on a
development server’s fallback behavior.

The offline check starts a private production server, caches the release,
closes the server and its connections, and confirms that network access fails.
Reload must then return a service-worker response; navigation and export must
still work. Chromium and Firefox additionally enable the offline flag.
WebKit uses the server outage because Playwright’s offline flag blocks even
literal worker responses ([upstream issue 42775](https://github.com/microsoft/playwright/issues/42775)).

The core domain suite contains fourteen tests. The campaign checker
exports and reloads every resolved turn and operation node. Its player
policy earns resources through ordinary game actions and can lose.
Later browser tests import checkpoints produced by that traversal to
exercise Carving, companions, and endings without pretending to have
manually played the intervening hours.

The browser suite contains 24 scenarios, run on three engines in CI.
The autosave regression holds the browser’s real save lock and advances a
virtual clock before choosing a story response. The update regression serves
a second worker revision, checks that a failed save blocks reload, and then
verifies the retained character and cache cleanup after saving succeeds.
The camp interaction regression visits every menu twice and uses the scene's
interaction key after each return. It catches a paused renderer and commands
discarded while the previous care effect is still playing.

Visual growth fixtures set XP directly only to inspect all eight portraits
in identical equipment. They are separate from progression tests.
Reference screenshots are in [screenshots](screenshots/). With the Vite
development server running, `npm run screenshots` regenerates them.

## Release checks observed on 26 September 2026

- Type checking, all fourteen domain tests, and the production build passed.
  The individual domain results were also checked with Node’s in-process
  test runner.
- Release `68f29d6` passed all **69 browser checks** in Chromium, Firefox,
  and WebKit and was published by
  [GitHub Actions run 36260752954](https://github.com/carlos-aws/omnis-vir-lupus/actions/runs/36260752954).
- The additional camp interaction regression failed before the renderer
  correction. Afterward, all **12 focused checks** passed across the three
  engines: repeated camp interaction, responsive navigation, mobile combat,
  and the full pixel prologue.
- All nine campaign traversals passed with save round trips at every step.
  Their progression and balance results are recorded below.
- Desktop and phone reference captures were regenerated and inspected.
  Capturing the late-game Sunlance effect produced no runtime errors.
- The published release passed an isolated phone-browser check for creation,
  care, reload, combat-turn reload, battle visibility, retreat checkpoints,
  offline reload, and exported-save validation, with no runtime errors.

The publishing workflow runs the full browser suite in Chromium, Firefox,
and WebKit on Ubuntu, retaining traces when a browser check fails.
[Current workflow results](https://github.com/carlos-aws/omnis-vir-lupus/actions/workflows/game.yml)
record verification and publishing for subsequent commits. The local
WebKit follow-up used Ubuntu libraries extracted under `/tmp` and linked into
the temporary browser bundle. CI installs its browser dependencies normally.

## Observed balance

| Difficulty | Red turns / defeats | Gold turns / defeats | Obsidian turns / defeats |
| --- | --- | --- | --- |
| Story | 895 / 0 | 964 / 0 | 893 / 0 |
| Standard | 1,805 / 0 | 1,757 / 0 | 1,835 / 0 |
| Veteran | 2,277 / 1 | 2,126 / 0 | 2,267 / 1 |

Each run completed 256 encounters, all eight life phases, an ending,
and three endgame patrols to reach level 80. Seeds are `4217`, `4218`,
and `4219`; endings vary by origin for coverage. The generated report
is `tools/out/campaign-report.json`. These runs check reachability and
save consistency, not the enjoyment or duration of a human playthrough.

## Open verification requirements

- **Playtime:** 10–14 hours on Standard is the design target. A timed human
  first playthrough has not established a ten-hour minimum. Faster reading,
  decisions, and Story difficulty can shorten play substantially.
- **AAA ambition:** the game has original art, effects, and a complete
  progression loop. It is an independent production, not an AAA-certified
  game. Visual review and automated tests do not establish AAA equivalence.
- **Devices:** responsive Chromium tests are not physical iOS/Android
  hardware tests. Mobile thermal behavior and browser storage eviction
  still need device testing.
- **Persistence:** no web application can keep local progress after the
  player or browser deletes its site data. Portable exports are the recovery
  path; there is no remote sync.
- **Audio and accessibility:** synthesized music is optional. Automated
  contrast and semantics checks do not replace listening, screen-reader
  testing, or broader accessibility testing by players.
