import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ABILITIES } from '../src/data/abilities.ts';
import { CHAPTERS } from '../src/data/chapters.ts';
import { ENEMY_MAP, ENEMIES } from '../src/data/enemies.ts';
import { ITEM_MAP, ITEMS } from '../src/data/items.ts';
import { GROWTH } from '../src/data/origins.ts';
import { campaign } from '../src/data/story.ts';
import { act, claimBattle, createBattle, recoverBattle } from '../src/game/combat.ts';
import { activeNode, advanceNode, buy, care, createGame, equip, gainXp, growthOf, leaveExpedition, levelOf, startMission, tickCare, upgrade, xpForLevel } from '../src/game/state.ts';
import { BACKUP_KEY, decodeSave, encodeSave, SAVE_KEY, SaveConflict, SaveStore } from '../src/game/storage.ts';
import { hash } from '../src/game/math.ts';
import type { GameState, Origin } from '../src/game/types.ts';

function state(origin: Origin = 'red'): GameState { return createGame('Aren', origin, 1_790_000_000_000, 23); }
function encounter(): GameState {
  const game = state();
  startMission(game, campaign(game.origin)[0].id);
  advanceNode(game);
  advanceNode(game, 'overlook');
  createBattle(game);
  return game;
}
function memoryStorage() {
  const records = new Map<string, string>();
  return {
    getItem: (key: string) => records.get(key) ?? null,
    setItem: (key: string, value: string) => { records.set(key, value); },
    removeItem: (key: string) => { records.delete(key); },
    records,
  };
}

test('leaving and restarting an operation cannot duplicate salvage or rewrite a remembered choice', () => {
  const game = state();
  const mission = campaign('red')[0];
  startMission(game, mission.id);
  advanceNode(game);
  advanceNode(game, 'salvage');
  const credits = game.credits, tonics = game.inventory['focus-tonic'];
  leaveExpedition(game);
  startMission(game, mission.id);
  advanceNode(game);
  advanceNode(game, 'overlook');
  assert.equal(game.credits, credits);
  assert.equal(game.inventory['focus-tonic'], tonics);
  assert.equal(game.expedition!.choices[`${mission.id}:1`], 'salvage');
  assert.equal(createBattle(game).boost, 1);
});

test('every campaign has 64 reachable operations, 256 fights, valid opponents, choices, and rewards', () => {
  assert.equal(CHAPTERS.length, 16);
  assert.equal(GROWTH.length, 8);
  assert.equal(new Set(ITEMS.map(item => item.id)).size, ITEMS.length);
  assert.equal(new Set(ENEMIES.map(enemy => enemy.id)).size, ENEMIES.length);
  assert.equal(ENEMIES.filter(enemy => enemy.boss).length, 16);
  assert.equal(new Set(ABILITIES.map(ability => ability.id)).size, ABILITIES.length);
  for (const origin of ['red', 'gold', 'obsidian'] as const) {
    const missions = campaign(origin);
    assert.equal(missions.length, 64);
    assert.equal(new Set(missions.map(m => m.id)).size, 64);
    assert.equal(missions.flatMap(m => m.nodes).filter(n => n.kind === 'battle').length, 256);
    for (const mission of missions) {
      assert.ok(mission.level >= 1 && mission.level <= 80);
      assert.ok(ITEM_MAP[mission.reward.item!]);
      for (const node of mission.nodes) {
        assert.ok(node.title && node.text);
        if (node.kind === 'battle') {
          assert.ok(node.enemies?.length);
          for (const id of node.enemies!) assert.ok(ENEMY_MAP[id], id);
        }
        if (node.choices) assert.equal(new Set(node.choices.map(c => c.id)).size, node.choices.length);
      }
    }
  }
});

test('origins differ before convergence and Red alone retains a transformation path', () => {
  const openings = (['red', 'gold', 'obsidian'] as const).map(origin => campaign(origin)[0].nodes[0].text);
  assert.equal(new Set(openings).size, 3);
  assert.match(campaign('red')[11].nodes[11].text, /Gold/);
  assert.match(campaign('obsidian')[11].nodes[11].text, /implant/);
  assert.equal(campaign('red')[12].nodes[0].text, campaign('gold')[12].nodes[0].text);
});

test('growth is monotonic, all eight ages are reachable, and XP caps at level 80', () => {
  const game = state();
  for (let level = 2; level <= 80; level++) assert.ok(xpForLevel(level) > xpForLevel(level - 1));
  for (const stage of GROWTH) {
    game.xp = xpForLevel(stage.level);
    assert.equal(levelOf(game), stage.level);
    assert.equal(growthOf(game).name, stage.name);
  }
  gainXp(game, 1e9);
  assert.equal(game.xp, xpForLevel(80));
  assert.equal(levelOf(game), 80);
  assert.throws(() => gainXp(game, Number.NaN));
});

test('offline needs are bounded and a backwards clock cannot add progress', () => {
  const game = state();
  const original = structuredClone(game);
  tickCare(game, game.lastCareTick - 5000);
  assert.deepEqual(game, original);
  tickCare(game, game.lastCareTick + 365 * 86400000);
  assert.ok(game.needs.nourishment >= 25);
  assert.equal(game.hp, original.hp);
  assert.equal(game.xp, 0);
});

test('care cannot create unlimited training XP or spend nonexistent food', () => {
  const game = state();
  for (let i = 0; i < 3; i++) care(game, 'train');
  const xp = game.xp;
  assert.throws(() => care(game, 'train'));
  assert.equal(game.xp, xp);
  game.inventory.ration = 0;
  assert.throws(() => care(game, 'meal'));
  care(game, 'forage');
  care(game, 'meal');
  assert.equal(game.inventory.ration, 1);
});

test('equipment and shop operations reject unowned, unaffordable and invalid transactions', () => {
  const game = state();
  const before = structuredClone(game);
  assert.throws(() => equip(game, 't8-razor'));
  assert.throws(() => buy(game, 'medkit', -5));
  assert.throws(() => upgrade(game, 't8-armor'));
  assert.deepEqual(game, before);
  buy(game, 'focus-tonic', 2);
  assert.equal(game.inventory['focus-tonic'], 5);
  assert.equal(game.credits, before.credits - 44);
});

test('invalid combat actions do not spend focus, items, RNG, or a turn', () => {
  const game = encounter();
  const before = encodeSave(game);
  assert.throws(() => act(game, { type: 'ability', id: 'daybreak', target: 'enemy-0' }));
  assert.throws(() => act(game, { type: 'ability', id: 'sunder', target: 'missing' }));
  assert.throws(() => act(game, { type: 'ability', id: 'sunder', target: 'enemy-0', boosted: true }));
  assert.throws(() => act(game, { type: 'item', id: 'ration' }));
  assert.deepEqual(decodeSave(encodeSave(game)), decodeSave(before));
});

test('combat is deterministic after an in-progress save reload', () => {
  const game = encounter();
  const reloaded = decodeSave(encodeSave(game));
  const action = { type: 'ability', id: 'sunder', target: 'enemy-0' } as const;
  assert.deepEqual(act(game, action), act(reloaded, action));
  assert.deepEqual(game, reloaded);
});

test('a break prevents the defender’s action; victory rewards are claimed only once', () => {
  const game = encounter();
  const events = act(game, { type: 'ability', id: 'sunder', target: 'enemy-0' });
  assert.ok(events.some(event => event.kind === 'break'));
  assert.ok(!events.some(event => event.kind === 'hit' && event.source === 'enemy-0' && event.target === 'hero'));
  game.battle!.enemies.forEach(enemy => { enemy.hp = 0; });
  game.battle!.outcome = 'won';
  const result = claimBattle(game);
  const credits = game.credits;
  assert.ok(result.xp > 0 && result.credits > 0);
  assert.throws(() => claimBattle(game));
  assert.equal(game.credits, credits);
  assert.ok(game.expedition!.resolved.includes(game.expedition!.node));
  advanceNode(game);
  assert.equal(activeNode(game)!.kind, 'story');
});

test('retreat preserves the expedition checkpoint and does not award victory', () => {
  const game = encounter();
  const credits = game.credits;
  act(game, { type: 'flee' });
  recoverBattle(game);
  assert.equal(game.battle, null);
  assert.equal(game.expedition!.node, 2);
  assert.equal(game.credits, credits);
  assert.throws(() => advanceNode(game));
  createBattle(game);
  assert.equal(game.battle!.round, 1);
});

test('export/import round trip preserves a full state; malformed or tampered backups are rejected', () => {
  const game = encounter();
  assert.deepEqual(decodeSave(encodeSave(game)), game);
  assert.throws(() => decodeSave('not JSON'));
  assert.throws(() => decodeSave(JSON.stringify({ profiles: [] })));
  const parsed = JSON.parse(encodeSave(game));
  parsed.state.inventory['unknown-weapon'] = 1;
  parsed.checksum = hash(JSON.stringify(parsed.state)).toString(16).padStart(8, '0');
  assert.throws(() => decodeSave(JSON.stringify(parsed)), /inventory/);
  const tampered = encodeSave(game).replace('"xp":0', '"xp":100');
  assert.throws(() => decodeSave(tampered), /checksum/);
  const reserved = state();
  Object.defineProperty(reserved.inventory, 'constructor', { value: 1, enumerable: true });
  assert.throws(() => decodeSave(encodeSave(reserved)), /inventory item/);
  const invalidChoice = state();
  invalidChoice.choices['c01-m1:1'] = 'unknown-road';
  assert.throws(() => decodeSave(encodeSave(invalidChoice)), /unknown remembered decision/);
});

test('local saves recover a previous valid checkpoint without erasing damaged data', () => {
  const storage = memoryStorage();
  const store = new SaveStore(storage);
  store.load();
  const game = state();
  assert.equal(store.write(game), true);
  game.credits += 10;
  store.write(game);
  assert.ok(storage.records.has(BACKUP_KEY));
  storage.setItem(SAVE_KEY, '{corrupt');
  const recovered = new SaveStore(storage);
  assert.equal(recovered.load()!.credits, 120);
  assert.equal(storage.getItem(SAVE_KEY), '{corrupt');
  assert.match(recovered.warning!, /recovered/);
  assert.equal(recovered.write(recovered.load()!), true);
});

test('failed durable saves are reported and concurrent tabs cannot silently overwrite changes', () => {
  const storage = memoryStorage();
  const a = new SaveStore(storage);
  const b = new SaveStore(storage);
  a.load(); b.load();
  a.write(state());
  assert.throws(() => b.write(state()), SaveConflict);
  const blocked = new SaveStore({ ...storage, setItem: () => { throw new Error('QuotaExceededError'); } });
  blocked.load();
  assert.equal(blocked.write(state()), false);
  assert.equal(blocked.durable, false);
  assert.match(blocked.warning!, /could not be saved/);
});
