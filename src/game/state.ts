import { ABILITIES } from '../data/abilities.ts';
import { ITEM_MAP, SLOTS } from '../data/items.ts';
import { COMPANIONS, GROWTH, ORIGINS } from '../data/origins.ts';
import { campaign, ENDINGS, huntMission } from '../data/story.ts';
import type { Ability, GameState, Item, Mission, Need, Origin, Settings, Stats, StoryNode } from './types.ts';
import { clamp, hash } from './math.ts';

export const MAX_LEVEL = 80;
export const xpForLevel = (level: number): number => {
  const n = clamp(Math.floor(level), 1, MAX_LEVEL) - 1;
  return 36 * n * n + 85 * n;
};

export function levelOf(state: Pick<GameState, 'xp'>): number {
  let level = 1;
  while (level < MAX_LEVEL && state.xp >= xpForLevel(level + 1)) level++;
  return level;
}

export const growthOf = (state: Pick<GameState, 'xp'>) => {
  const level = levelOf(state);
  return GROWTH.filter(stage => stage.level <= level).at(-1)!;
};
export const colorOf = (state: Pick<GameState, 'origin' | 'carved'>): Origin => state.carved ? 'gold' : state.origin;
export const readiness = (state: Pick<GameState, 'needs'>): number => Object.values(state.needs).reduce((a, b) => a + b, 0) / 4;
export const readinessLabel = (state: Pick<GameState, 'needs'>): string => readiness(state) >= 75 ? 'Ready for the road' : readiness(state) >= 45 ? 'Holding steady' : 'Needs a quiet moment';

export const defaultSettings = (): Settings => ({
  sound: true, music: false, volume: 0.55, reducedMotion: false,
  difficulty: 'standard', battleSpeed: 1, textSize: 'normal',
});

export function statsOf(state: Pick<GameState, 'xp' | 'origin' | 'equipment' | 'upgrades' | 'needs'>): Stats {
  const level = levelOf(state);
  const stats: Stats = {
    maxHp: 150 + level * 24 + (state.origin === 'obsidian' ? 30 + level * 3 : 0),
    maxFocus: 45 + Math.floor(level * 1.15) + (state.origin === 'gold' ? 14 : 0),
    attack: 17 + level * 3.7,
    defense: 5 + level * 1.1,
    speed: 10 + Math.floor(level * 0.55),
  };
  for (const slot of SLOTS) {
    const id = state.equipment[slot];
    if (!id) continue;
    const item = ITEM_MAP[id];
    const upgrades = state.upgrades[id] ?? 0;
    for (const [key, value] of Object.entries(item?.stats ?? {})) {
      stats[key as keyof Stats] += value * (1 + upgrades * 0.15);
    }
  }
  const ready = readiness(state);
  stats.attack *= ready >= 75 ? 1.08 : ready < 35 ? 0.95 : 1;
  for (const key of Object.keys(stats) as (keyof Stats)[]) stats[key] = Math.round(stats[key]);
  return stats;
}

export function createGame(name: string, origin: Origin, now = Date.now(), seed = hash(`${now}-${name}`)): GameState {
  const identity = ORIGINS[origin];
  if (!identity) throw new Error('Choose Red, Gold, or Obsidian.');
  const cleanName = name.trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 24);
  if (!cleanName) throw new Error('Give your character a name.');
  const state: GameState = {
    schema: 1, id: `wolf-${now.toString(36)}-${seed.toString(36)}`,
    name: cleanName, origin, carved: false, createdAt: now, updatedAt: now,
    playSeconds: 0, lastCareTick: now, xp: 0, credits: 120, hp: 1, focus: 1,
    needs: { nourishment: 86, rest: 92, resolve: 78, connection: 65 },
    inventory: { [identity.weapon]: 1, [identity.armor]: 1, medkit: 5, 'focus-tonic': 3, antidote: 2, ration: 5, alloy: 2 },
    equipment: { weapon: identity.weapon, armor: identity.armor, relic: null },
    upgrades: {}, completed: [], choices: {}, virtues: { mercy: 0, defiance: 0, ambition: 0 },
    expedition: null, battle: null, companion: identity.companion,
    bonds: Object.fromEntries(COMPANIONS.map(c => [c.id, c.id === identity.companion ? 15 : 0])),
    journal: [{ id: 'origin', title: `A ${identity.name} beginning`, text: identity.prologue, at: now }],
    bestiary: {}, achievements: [], training: 0, careActions: 0, victories: 0, defeats: 0,
    hunts: 0, ending: null, tutorialSeen: false, settings: defaultSettings(), rng: seed || 1,
  };
  const stats = statsOf(state);
  state.hp = stats.maxHp;
  state.focus = stats.maxFocus;
  return state;
}

export function addItem(state: GameState, id: string, quantity = 1): void {
  if (!ITEM_MAP[id] || !Number.isInteger(quantity) || quantity < 1) throw new Error('Unknown item or quantity.');
  state.inventory[id] = clamp((state.inventory[id] ?? 0) + quantity, 0, 9999);
}

export function consumeItem(state: GameState, id: string): void {
  if ((state.inventory[id] ?? 0) < 1) throw new Error('You do not have that item.');
  state.inventory[id]--;
  if (!state.inventory[id]) delete state.inventory[id];
}

export function gainXp(state: GameState, amount: number): number {
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Invalid experience reward.');
  const oldLevel = levelOf(state);
  state.xp = Math.min(xpForLevel(MAX_LEVEL), state.xp + Math.round(amount));
  const levels = levelOf(state) - oldLevel;
  if (levels > 0) {
    const stats = statsOf(state);
    state.hp = stats.maxHp;
    state.focus = stats.maxFocus;
    if (state.battle && state.battle.outcome !== 'active') {
      state.battle.hero.hp = stats.maxHp;
      state.battle.hero.focus = stats.maxFocus;
    }
  }
  checkAchievements(state);
  return levels;
}

/** Offline care is bounded, never fatal, and never awards progress. */
export function tickCare(state: GameState, now = Date.now()): void {
  if (!Number.isFinite(now) || now <= state.lastCareTick) return;
  const hours = Math.min((now - state.lastCareTick) / 3600000, 8);
  const rates: Record<Need, number> = { nourishment: 2.5, rest: 1.3, resolve: 0.8, connection: 0.7 };
  for (const key of Object.keys(rates) as Need[]) {
    state.needs[key] = Math.max(Math.min(25, state.needs[key]), state.needs[key] - hours * rates[key]);
  }
  state.lastCareTick = now;
}

export type CareAction = 'meal' | 'rest' | 'train' | 'talk' | 'forage' | 'wash';

export function care(state: GameState, action: CareAction): { text: string; xp?: number } {
  if (state.battle) throw new Error('Finish the encounter before making camp.');
  const stats = statsOf(state);
  let text = '';
  let xp = 0;
  switch (action) {
    case 'meal':
      consumeItem(state, 'ration');
      state.needs.nourishment = clamp(state.needs.nourishment + 42, 0, 100);
      state.needs.resolve = clamp(state.needs.resolve + 8, 0, 100);
      state.hp = Math.min(stats.maxHp, state.hp + Math.round(stats.maxHp * 0.12));
      text = 'A warm meal. For a little while, there is nowhere else you need to be.';
      break;
    case 'rest':
      state.needs.rest = 100;
      state.hp = stats.maxHp;
      state.focus = stats.maxFocus;
      text = 'Your companion takes the watch. Health, focus, and rest are restored.';
      break;
    case 'train':
      if (state.training >= 3) throw new Error('Three training sessions completed. Return from an expedition to learn more.');
      if (state.needs.rest < 20) throw new Error('Rest before training.');
      state.training++;
      state.needs.rest = clamp(state.needs.rest - 10, 0, 100);
      state.needs.resolve = clamp(state.needs.resolve + 18, 0, 100);
      xp = 18 + levelOf(state) * 3;
      gainXp(state, xp);
      text = 'Footwork. Breath. A cleaner opening. You finish a little more certain of yourself.';
      break;
    case 'talk': {
      const companion = COMPANIONS.find(c => c.id === state.companion)!;
      const previous = state.bonds[companion.id] ?? 0;
      const connectionGain = Math.min(22, 100 - state.needs.connection);
      state.needs.connection = clamp(state.needs.connection + 22, 0, 100);
      state.needs.resolve = clamp(state.needs.resolve + 5, 0, 100);
      // Empty tapping at full connection cannot grind bond.
      state.bonds[companion.id] = Math.min(100, previous + Math.ceil(connectionGain / 7));
      text = companion.lines[Math.min(companion.lines.length - 1, Math.floor(previous / 22))];
      break;
    }
    case 'forage':
      if ((state.inventory.ration ?? 0) >= 8) throw new Error('The supply basket is full. Share a meal before gathering more.');
      addItem(state, 'ration', 2);
      state.needs.rest = clamp(state.needs.rest - 3, 0, 100);
      text = 'You gather herbs and trade a little work for two rations. The camp provides.';
      break;
    case 'wash':
      state.needs.resolve = clamp(state.needs.resolve + 15, 0, 100);
      state.needs.connection = clamp(state.needs.connection + 4, 0, 100);
      text = 'Cool water, clean bandages, a repaired buckle. Small things make a person feel human.';
      break;
  }
  state.careActions++;
  checkAchievements(state);
  return { text, xp: xp || undefined };
}

export function abilitiesFor(state: GameState): Ability[] {
  return ABILITIES.filter(ability => ability.level <= levelOf(state) && (!ability.origin || ability.origin === state.origin));
}

export function equip(state: GameState, id: string): void {
  if (state.battle) throw new Error('Equipment cannot be changed during an encounter.');
  const item = ITEM_MAP[id];
  if (!item || !SLOTS.includes(item.kind as typeof SLOTS[number])) throw new Error('That item cannot be equipped.');
  if (!state.inventory[id]) throw new Error('You do not own that equipment.');
  if (levelOf(state) < item.level) throw new Error(`Requires level ${item.level}.`);
  state.equipment[item.kind as typeof SLOTS[number]] = id;
  const stats = statsOf(state);
  state.hp = Math.min(state.hp, stats.maxHp);
  state.focus = Math.min(state.focus, stats.maxFocus);
}

export function buy(state: GameState, id: string, quantity = 1): void {
  if (state.battle) throw new Error('The quartermaster is back at camp.');
  const item = ITEM_MAP[id];
  if (!item || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new Error('Invalid purchase.');
  if (item.level > levelOf(state) + 5) throw new Error('That stock is not available yet.');
  if (SLOTS.includes(item.kind as typeof SLOTS[number]) && (state.inventory[id] || quantity !== 1)) throw new Error('You already own that equipment.');
  const cost = item.price * quantity;
  if (state.credits < cost) throw new Error(`You need ${cost - state.credits} more credits.`);
  state.credits -= cost;
  addItem(state, id, quantity);
}

export function sell(state: GameState, id: string): number {
  if (state.battle) throw new Error('Finish the encounter first.');
  const item = ITEM_MAP[id];
  if (!item || !state.inventory[id]) throw new Error('You do not have that item.');
  if (Object.values(state.equipment).includes(id) && state.inventory[id] === 1) throw new Error('Equip something else before selling your last copy.');
  const value = Math.max(1, Math.floor(item.price * 0.4));
  consumeItem(state, id);
  state.credits += value;
  return value;
}

export function upgradeCost(state: GameState, item: Item): { credits: number; alloy: number; sunstone: number } {
  const level = state.upgrades[item.id] ?? 0;
  return { credits: Math.round(35 + item.level * 5 + level * 50), alloy: 2 + level * 2, sunstone: level >= 3 ? level - 2 : 0 };
}

export function upgrade(state: GameState, id: string): void {
  if (state.battle) throw new Error('The forge is back at camp.');
  const item = ITEM_MAP[id];
  if (!item || !SLOTS.includes(item.kind as typeof SLOTS[number]) || !state.inventory[id]) throw new Error('Choose equipment you own.');
  if ((state.upgrades[id] ?? 0) >= 5) throw new Error('This equipment is fully forged.');
  const cost = upgradeCost(state, item);
  if (state.credits < cost.credits || (state.inventory.alloy ?? 0) < cost.alloy || (state.inventory.sunstone ?? 0) < cost.sunstone) throw new Error('You need more credits or forge materials.');
  state.credits -= cost.credits;
  state.inventory.alloy -= cost.alloy;
  if (cost.sunstone) state.inventory.sunstone -= cost.sunstone;
  state.upgrades[id] = (state.upgrades[id] ?? 0) + 1;
  checkAchievements(state);
}

export function useSupply(state: GameState, id: string): void {
  if (state.battle) throw new Error('Use the battle supplies menu during an encounter.');
  const item = ITEM_MAP[id];
  if (!item || item.kind !== 'consumable' || !item.effect) throw new Error('That is not a supply.');
  if (item.effect === 'food') { care(state, 'meal'); return; }
  const stats = statsOf(state);
  if (item.effect === 'focus' && state.focus >= stats.maxFocus) throw new Error('Focus is already full.');
  if ((item.effect === 'heal' || item.effect === 'cleanse') && state.hp >= stats.maxHp) throw new Error('Health is already full.');
  consumeItem(state, id);
  if (item.effect === 'focus') state.focus = Math.min(stats.maxFocus, state.focus + Math.round(stats.maxFocus * (item.amount ?? 0)));
  else state.hp = Math.min(stats.maxHp, state.hp + Math.round(stats.maxHp * (item.amount ?? 0)));
}

export const storyCompleted = (state: GameState): number => state.completed.filter(id => /^c\d\d-m[1-4]$/.test(id)).length;
export const chapterOf = (state: GameState): number => Math.min(15, Math.floor(storyCompleted(state) / 4));
export const nextMission = (state: GameState): Mission | undefined => campaign(state.origin).find(mission => !state.completed.includes(mission.id));

export function activeMission(state: GameState): Mission | null {
  if (!state.expedition) return null;
  if (state.expedition.missionId.startsWith('hunt-')) {
    const [, chapter, run] = state.expedition.missionId.split('-');
    return huntMission(Number(chapter), Number(run));
  }
  return campaign(state.origin).find(mission => mission.id === state.expedition?.missionId) ?? null;
}

export function activeNode(state: GameState): StoryNode | null {
  const mission = activeMission(state);
  return mission?.nodes[state.expedition?.node ?? 0] ?? null;
}

export function startMission(state: GameState, id: string): Mission {
  if (state.expedition) throw new Error('Finish or leave your current expedition first.');
  const mission = campaign(state.origin).find(value => value.id === id);
  if (!mission || nextMission(state)?.id !== id) throw new Error('That operation is not available.');
  state.expedition = { missionId: id, node: 0, choices: {}, resolved: [], startedAt: Date.now() };
  state.needs.rest = clamp(state.needs.rest - 6, 0, 100);
  state.needs.nourishment = clamp(state.needs.nourishment - 6, 0, 100);
  return mission;
}

export function startHunt(state: GameState, chapter = chapterOf(state)): Mission {
  if (state.expedition) throw new Error('Finish your current expedition first.');
  if (chapter < 0 || chapter > chapterOf(state) || !Number.isInteger(chapter)) throw new Error('That region is not yet open.');
  const mission = huntMission(chapter, state.hunts);
  state.expedition = { missionId: mission.id, node: 0, choices: {}, resolved: [], startedAt: Date.now() };
  state.hunts++;
  return mission;
}

export function leaveExpedition(state: GameState): void {
  if (state.battle) throw new Error('Finish or retreat from the encounter first.');
  state.expedition = null;
}

export function addJournal(state: GameState, id: string, title: string, text: string): void {
  if (state.journal.some(entry => entry.id === id)) return;
  state.journal.push({ id, title, text, at: Date.now() });
  if (state.journal.length > 400) state.journal.splice(1, state.journal.length - 400);
}

export function advanceNode(state: GameState, choiceId?: string): { text?: string; completed?: Mission; levels?: number } {
  const mission = activeMission(state);
  const expedition = state.expedition;
  if (!mission || !expedition) throw new Error('There is no active expedition.');
  if (state.battle) throw new Error('Resolve the encounter first.');
  const node = mission.nodes[expedition.node];
  if (!node) throw new Error('Unknown expedition step.');
  if (node.kind === 'battle' && !expedition.resolved.includes(expedition.node)) throw new Error('Win this encounter before continuing.');
  let text: string | undefined;
  const key = `${mission.id}:${expedition.node}`;
  const stats = statsOf(state);
  if (node.choices) {
    const firstChoice = !state.choices[key];
    const choice = node.choices.find(value => value.id === (state.choices[key] ?? choiceId));
    if (!choice) throw new Error('Choose a way forward.');
    expedition.choices[key] = choice.id;
    if (!state.choices[key]) {
      state.choices[key] = choice.id;
      if (node.kind === 'choice') state.virtues[choice.virtue]++;
      if (choice.reward?.credits) state.credits += choice.reward.credits;
      if (choice.reward?.item) addItem(state, choice.reward.item, choice.reward.quantity ?? 1);
      addJournal(state, key, node.title, `${node.text}\n\n${choice.label}. ${choice.response}`);
    }
    text = choice.response;
    if (node.kind === 'explore') {
      if (choice.id === 'shelter') state.hp = Math.min(stats.maxHp, state.hp + Math.round(stats.maxHp * 0.15));
      if (choice.id === 'overlook') state.focus = Math.min(stats.maxFocus, state.focus + Math.round(stats.maxFocus * 0.25));
      if (choice.id === 'salvage' && firstChoice) {
        state.credits += 30;
        addItem(state, 'focus-tonic');
      }
    }
    if (ENDINGS[choice.id]) state.ending = choice.id;
  }
  if (node.kind === 'rest') {
    state.hp = Math.min(stats.maxHp, state.hp + Math.round(stats.maxHp * 0.45));
    state.focus = Math.min(stats.maxFocus, state.focus + Math.round(stats.maxFocus * 0.4));
    state.needs.rest = clamp(state.needs.rest + 10, 0, 100);
  }
  if (node.reward && !state.choices[`${key}:cache`]) {
    if (node.reward.credits) state.credits += node.reward.credits;
    if (node.reward.item) addItem(state, node.reward.item, node.reward.quantity ?? 1);
    state.choices[`${key}:cache`] = 'claimed';
  }
  if (!expedition.resolved.includes(expedition.node)) expedition.resolved.push(expedition.node);
  expedition.node++;
  if (expedition.node < mission.nodes.length) return { text };
  return { text, ...finishMission(state, mission) };
}

function finishMission(state: GameState, mission: Mission): { completed: Mission; levels: number } {
  let levels = 0;
  if (!state.completed.includes(mission.id)) {
    state.completed.push(mission.id);
    levels = gainXp(state, mission.reward.xp);
    state.credits += mission.reward.credits;
    if (mission.reward.item) addItem(state, mission.reward.item);
    addItem(state, 'ration', 2);
    addItem(state, 'medkit', 2);
    state.bonds[state.companion] = Math.min(100, (state.bonds[state.companion] ?? 0) + 3);
    state.training = 0;
    state.needs.connection = clamp(state.needs.connection - 10, 0, 100);
    state.needs.nourishment = clamp(state.needs.nourishment - 8, 0, 100);
    state.needs.resolve = clamp(state.needs.resolve - 4, 0, 100);
    if (!mission.side && mission.chapter === 2 && mission.index === 3 && state.origin === 'red') {
      state.carved = true;
      addJournal(state, 'carving', 'A second skin. The same soul.', 'The Carving is complete. You have become a Gold, but your Red origin and Mineborn fury remain. Your reflection changes; your memories do not.');
    }
    addJournal(state, mission.id, mission.title, mission.nodes.at(-1)?.text ?? mission.subtitle);
  }
  state.expedition = null;
  checkAchievements(state);
  return { completed: mission, levels };
}

export const ACHIEVEMENTS = [
  { id: 'first-step', title: 'The first refusal', text: 'Complete your first operation.', test: (s: GameState) => storyCompleted(s) >= 1 },
  { id: 'caretaker', title: 'More than a weapon', text: 'Care for your character twenty times.', test: (s: GameState) => s.careActions >= 20 },
  { id: 'carved', title: 'The same soul', text: 'Complete the Red’s Carving.', test: (s: GameState) => s.carved },
  { id: 'pack', title: 'A pack, not a house', text: 'Unite the three origins at the west tower.', test: (s: GameState) => storyCompleted(s) >= 16 },
  { id: 'bond', title: 'Someone who stays', text: 'Reach a companion bond of 80.', test: (s: GameState) => Object.values(s.bonds).some(bond => bond >= 80) },
  { id: 'veteran', title: 'Still standing', text: 'Win fifty encounters.', test: (s: GameState) => s.victories >= 50 },
  { id: 'smith', title: 'A blade with a history', text: 'Forge a piece of equipment to +5.', test: (s: GameState) => Object.values(s.upgrades).some(level => level >= 5) },
  { id: 'bestiary', title: 'Know the enemy', text: 'Record thirty different opponents.', test: (s: GameState) => Object.keys(s.bestiary).length >= 30 },
  { id: 'legend', title: 'A lifetime of choices', text: 'Reach the eighth growth phase.', test: (s: GameState) => levelOf(s) >= 76 },
  { id: 'eighty', title: 'Beyond the story', text: 'Reach level 80.', test: (s: GameState) => levelOf(s) === 80 },
  { id: 'dawn', title: 'A world after wolves', text: 'Complete the campaign and choose an ending.', test: (s: GameState) => s.ending !== null && storyCompleted(s) === 64 },
] as const;

export function checkAchievements(state: GameState): void {
  for (const achievement of ACHIEVEMENTS) {
    if (!state.achievements.includes(achievement.id) && achievement.test(state)) state.achievements.push(achievement.id);
  }
}
