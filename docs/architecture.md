# Architecture and progression

## Why this stack

The finished game must load as a static website, support mobile controls,
keep progress on the device, and remain free to build and run. Phaser owns
the rendering loop, input, textures, cameras, particles, and tweens.
TypeScript makes the save format and game rules explicit. The surrounding
interface uses native HTML controls, CSS, and dialogs for keyboard and
screen-reader access.

This is an independent implementation beside Pixel Pals. It preserves
local play, portable saves, bundled fonts, and synthesized sound while
replacing lesson-based rewards and calendar growth with RPG progression.
There is no Godot runtime, server, authentication flow, paid asset pack,
or remotely generated artwork in the delivered game.

## A committed action

```text
HTML command → domain validation → draft GameState mutation
             → Web Lock → compare checkpoint → durable write
             → adopt draft → Phaser presentation → refreshed controls
```

`ui/session.ts` owns this boundary. An invalid command or conflicting save
does not replace live state. Storage failure leaves the valid draft playable
in memory with a visible export warning. Combat resolves a whole turn before
animation; reloading during a spell restores the committed turn.

Clicks are queued while a background save finishes. Before dispatch, the
control must still belong to the displayed interface. This preserves input
during the periodic playtime checkpoint and discards duplicate requests from
controls that a completed transaction already replaced. Keyboard shortcuts
use the same route.

The renderer is a single retained Phaser instance. Its canvas is moved
between screens, paused when absent or hidden, and resized with its parent.
Temporary combat geometry is disposed when its animation ends or the
environment changes. Sprite portraits use a bounded cache.

## Campaign model

Each origin has 64 operations across sixteen chapters. The first twelve
operations contain origin-specific scenes. The Red path’s Carving completes
in operation 12. Chapter 4 brings the paths together, with all companions
available after its four operations.

An ordinary operation contains an opening, a route decision, four encounters,
field scenes, a supply cache, a moral decision, a rest stop, and an ending.
The fourth operation in each chapter ends with its boss. The last operation
adds the final explicit ending choice. The journal records earlier choices
and virtues; endings are not secretly locked behind a hidden morality score.

Rewards and decisions have stable operation/node keys. Abandoning and
replaying an operation cannot duplicate victories or salvage rewards.
Patrols use distinct run IDs, provide two encounters, and remain available
after the ending.

## Progression and balance

Level `L` begins at `36 × (L − 1)² + 85 × (L − 1)` total XP, capped at
level 80. Encounter XP depends on enemy level and boss status; operation XP
and material rewards support growth and equipment purchases without
requiring idle-time rewards. Training is limited to three sessions between
completed operations or patrols.

The campaign simulator uses ordinary care, purchases, equipment, focus,
healing supplies, guarding, breaks, and support. It reloads an exported save
after every resolved turn and every operation node. It cannot inject
currency, levels, invulnerability, or free combat resources.

The nine tested origin/difficulty combinations end at level 78, then reach
80 in three late-game patrols. Standard traversal uses roughly 1,750–1,840
turns with this policy. This supports tuning, not a measured duration claim:
reading speed and time spent choosing, exploring menus, preparing, and
retrying differ considerably between people.

The target is a 10–14 hour Standard first playthrough. A timed human run is
still required to validate it. There are no forced waits or artificial
playtime gates. Story difficulty deliberately allows shorter encounters.

## Save and offline contracts

Saves use a versioned JSON envelope and checksum, under
`omnis-vir-lupus.save.v1`; a previous valid record is kept separately.
Validation checks origin, nested fields, inventory, equipment ownership,
chapter order, Carving, ending state, expedition position, and combat
participants. The checksum detects accidental changes; it is not a security
boundary or anti-cheat mechanism.

Web Locks serialize same-origin writes across tabs. Compare-before-write
also rejects a stale tab. Backups are validated before replacement.
The service worker caches a complete release, uses a scope-specific cache
prefix, and preserves unrelated applications’ caches. An update activates
when the player elects to save and reload. All runtime assets and license
notices are available offline after the initial cache completes.

## Extending the game

Add enemies, items, and abilities in `src/data/`, with stable IDs. Narrative
changes should preserve existing operation IDs and node positions for
active saves, or include an explicit save migration. New command types need
domain validation before mutation, an accessible HTML control, and a
presentation event when useful. Test meaningful gameplay outcomes, not
the number of DOM elements or a copy of a formula.
