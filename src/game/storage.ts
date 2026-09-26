import { ENEMY_MAP } from '../data/enemies.ts';
import { ITEM_MAP } from '../data/items.ts';
import { COMPANIONS } from '../data/origins.ts';
import { campaign, ENDINGS } from '../data/story.ts';
import { hash } from './math.ts';
import { activeMission, activeNode, defaultSettings, statsOf, storyCompleted, xpForLevel } from './state.ts';
import type { GameState, SaveEnvelope } from './types.ts';

export const SAVE_KEY = 'omnis-vir-lupus.save.v1'; // gitleaks:allow - public localStorage name
export const BACKUP_KEY = 'omnis-vir-lupus.previous.v1'; // gitleaks:allow - public localStorage name
export const MAX_SAVE_BYTES = 2_000_000;

const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid save: ${message}`);
}
function number(value: unknown, min: number, max: number, integer = false): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isInteger(value));
}
const text = (value: unknown, max: number) => typeof value === 'string' && value.length <= max;
const STATUS_IDS = ['burn', 'bleed', 'weaken', 'regen'];
const INTENT_IDS = ['strike', 'heavy', 'guard', 'charge', 'heal', 'afflict', 'flurry'];
const MAIN_ID = /^c(0[1-9]|1[0-6])-m[1-4]$/;
const HUNT_ID = /^hunt-([0-9]|1[0-5])-\d{1,7}$/;

function statusMap(value: unknown): boolean {
  return record(value) && Object.entries(value).every(([key, turns]) => STATUS_IDS.includes(key) && number(turns, 0, 10, true));
}

/** Reject invalid saves before any live state or storage is replaced. */
export function validateState(value: unknown): GameState {
  requireValue(record(value), 'missing game state.');
  requireValue(value.schema === 1, 'unsupported game version.');
  requireValue(['red', 'gold', 'obsidian'].includes(value.origin as string), 'unknown origin.');
  requireValue(text(value.name, 24) && (value.name as string).trim().length > 0, 'character name.');
  requireValue(text(value.id, 120) && (value.id as string).length > 0, 'character identifier.');
  requireValue(typeof value.carved === 'boolean' && (!value.carved || value.origin === 'red'), 'Carving state.');
  for (const key of ['createdAt', 'updatedAt', 'lastCareTick']) requireValue(number(value[key], 0, 9e15), `${key}.`);
  requireValue(number(value.xp, 0, xpForLevel(80), true), 'experience.');
  requireValue(number(value.credits, 0, 1e9, true), 'credits.');
  requireValue(number(value.playSeconds, 0, 1e10), 'play time.');
  for (const key of ['careActions', 'victories', 'defeats', 'hunts']) requireValue(number(value[key], 0, 1e7, true), `${key}.`);
  requireValue(number(value.training, 0, 3, true), 'training.');
  requireValue(number(value.rng, 0, 4294967295, true), 'random state.');
  requireValue(record(value.needs), 'care needs.');
  for (const key of ['nourishment', 'rest', 'resolve', 'connection']) requireValue(number(value.needs[key], 0, 100), `need ${key}.`);
  requireValue(Object.keys(value.needs).length === 4, 'unexpected care need.');
  requireValue(record(value.inventory) && Object.keys(value.inventory).length <= 200, 'inventory.');
  for (const [id, quantity] of Object.entries(value.inventory)) requireValue(Object.hasOwn(ITEM_MAP, id) && number(quantity, 0, 9999, true), `inventory item ${id}.`);
  requireValue(record(value.equipment), 'equipment.');
  for (const slot of ['weapon', 'armor', 'relic']) {
    const id = value.equipment[slot];
    requireValue(id === null || typeof id === 'string' && ITEM_MAP[id]?.kind === slot && Number(value.inventory[id]) > 0, `equipped ${slot}.`);
  }
  requireValue(record(value.upgrades), 'forge upgrades.');
  for (const [id, level] of Object.entries(value.upgrades)) requireValue(Object.hasOwn(ITEM_MAP, id) && number(level, 0, 5, true), 'forge level.');
  requireValue(Array.isArray(value.completed) && value.completed.length <= 20000, 'completed operations.');
  requireValue(value.completed.every(id => typeof id === 'string' && (MAIN_ID.test(id) || HUNT_ID.test(id))), 'unknown completed operation.');
  requireValue(new Set(value.completed).size === value.completed.length, 'duplicate completed operation.');
  requireValue(record(value.choices) && Object.keys(value.choices).length <= 50000, 'choices.');
  for (const [key, choice] of Object.entries(value.choices)) requireValue(text(key, 120) && text(choice, 64), 'choice identifier.');
  requireValue(record(value.virtues), 'values.');
  for (const key of ['mercy', 'defiance', 'ambition']) requireValue(number(value.virtues[key], 0, 1000, true), `value ${key}.`);
  requireValue(COMPANIONS.some(c => c.id === value.companion), 'companion.');
  requireValue(record(value.bonds), 'companion bonds.');
  for (const companion of COMPANIONS) requireValue(number(value.bonds[companion.id], 0, 100), 'companion bond.');
  requireValue(Array.isArray(value.journal) && value.journal.length <= 400, 'journal.');
  for (const entry of value.journal) {
    requireValue(record(entry) && text(entry.id, 120) && text(entry.title, 200) && text(entry.text, 10000) && number(entry.at, 0, 9e15), 'journal entry.');
  }
  requireValue(record(value.bestiary), 'bestiary.');
  for (const [id, count] of Object.entries(value.bestiary)) requireValue(Object.hasOwn(ENEMY_MAP, id) && number(count, 0, 1e7, true), 'bestiary entry.');
  requireValue(Array.isArray(value.achievements) && value.achievements.length <= 100 && value.achievements.every(id => text(id, 64)), 'achievements.');
  requireValue(value.ending === null || typeof value.ending === 'string' && Object.hasOwn(ENDINGS, value.ending), 'ending.');
  requireValue(typeof value.tutorialSeen === 'boolean', 'tutorial preference.');
  requireValue(record(value.settings), 'settings.');
  const settings = { ...defaultSettings(), ...value.settings };
  for (const key of ['sound', 'music', 'reducedMotion']) requireValue(typeof settings[key as keyof typeof settings] === 'boolean', `setting ${key}.`);
  requireValue(number(settings.volume, 0, 1), 'volume.');
  requireValue(['story', 'standard', 'veteran'].includes(settings.difficulty), 'difficulty.');
  requireValue([1, 2].includes(settings.battleSpeed), 'battle speed.');
  requireValue(['normal', 'large'].includes(settings.textSize), 'text size.');
  value.settings = settings;
  const state = value as unknown as GameState;
  const ordered = campaign(state.origin);
  for (const mission of ordered) {
    for (const [index, node] of mission.nodes.entries()) {
      const choice = state.choices[`${mission.id}:${index}`];
      if (choice !== undefined && node.choices) requireValue(node.choices.some(option => option.id === choice), 'unknown remembered decision.');
    }
  }
  const count = storyCompleted(state);
  requireValue(ordered.slice(0, count).every(mission => state.completed.includes(mission.id)), 'campaign sequence.');
  requireValue(state.carved === (state.origin === 'red' && count >= 12), 'Carving does not match story progress.');
  requireValue(state.ending === null ? count < 64 : count === 64, 'ending does not match story progress.');
  const stats = statsOf(state);
  requireValue(number(value.hp, 0, stats.maxHp), 'health.');
  requireValue(number(value.focus, 0, stats.maxFocus), 'focus.');
  requireValue(value.expedition === null || record(value.expedition), 'expedition.');
  if (value.expedition !== null) {
    const expedition = value.expedition;
    requireValue(record(expedition), 'expedition.');
    requireValue(typeof expedition.missionId === 'string' && (MAIN_ID.test(expedition.missionId) || HUNT_ID.test(expedition.missionId)), 'expedition identifier.');
    const mission = activeMission(state);
    requireValue(mission, 'unknown expedition.');
    requireValue(mission.side || ordered[count]?.id === mission.id, 'expedition is not the current operation.');
    requireValue(number(expedition.node, 0, mission.nodes.length - 1, true), 'expedition step.');
    requireValue(Array.isArray(expedition.resolved) && expedition.resolved.every(node => number(node, 0, Number(expedition.node), true)), 'resolved steps.');
    requireValue(record(expedition.choices) && Object.values(expedition.choices).every(choice => text(choice, 64)), 'expedition choices.');
    requireValue(number(expedition.startedAt, 0, 9e15), 'expedition start.');
  }
  requireValue(value.battle === null || record(value.battle), 'encounter.');
  if (value.battle !== null) {
    const battle = value.battle;
    requireValue(record(battle) && record(battle.hero) && state.expedition, 'encounter without expedition.');
    const node = activeNode(state);
    requireValue(node?.kind === 'battle' && node.enemies, 'encounter at a noncombat step.');
    requireValue(battle.id === `${state.expedition.missionId}:${state.expedition.node}` && battle.missionId === state.expedition.missionId && battle.node === state.expedition.node, 'encounter identifier.');
    requireValue(number(battle.round, 1, 100000, true), 'battle round.');
    requireValue(number(battle.rng, 0, 4294967295, true), 'battle random state.');
    requireValue(number(battle.boost, 0, 3, true) && number(battle.companionCooldown, 0, 4, true), 'battle resources.');
    requireValue(['active', 'won', 'lost', 'fled'].includes(battle.outcome as string), 'encounter outcome.');
    requireValue(typeof battle.boss === 'boolean' && typeof battle.rewardsClaimed === 'boolean', 'battle flags.');
    for (const key of ['maxHp', 'maxFocus', 'attack', 'defense', 'speed']) requireValue(number(battle.hero[key], 1, 1e6), `battle ${key}.`);
    requireValue(number(battle.hero.hp, 0, Number(battle.hero.maxHp)), 'battle health.');
    requireValue(number(battle.hero.focus, 0, Number(battle.hero.maxFocus)), 'battle focus.');
    requireValue(statusMap(battle.hero.statuses), 'player status.');
    requireValue(Array.isArray(battle.enemies) && battle.enemies.length === node.enemies.length, 'encounter opponents.');
    for (const [index, enemy] of battle.enemies.entries()) {
      requireValue(record(enemy) && enemy.id === node.enemies[index] && enemy.uid === `enemy-${index}`, 'opponent identity.');
      requireValue(text(enemy.name, 100), 'opponent name.');
      requireValue(number(enemy.level, 1, 80, true), 'opponent level.');
      for (const key of ['maxHp', 'attack', 'defense']) requireValue(number(enemy[key], 1, 1e7), `opponent ${key}.`);
      requireValue(number(enemy.hp, 0, Number(enemy.maxHp)), 'opponent health.');
      requireValue(number(enemy.maxShield, 1, 20, true) && number(enemy.shield, 0, Number(enemy.maxShield), true) && number(enemy.broken, 0, 2, true), 'opponent shield.');
      requireValue(typeof enemy.charged === 'boolean' && typeof enemy.guarding === 'boolean', 'opponent stance.');
      requireValue(INTENT_IDS.includes(enemy.intent as string) && statusMap(enemy.statuses), 'opponent intent or status.');
    }
    requireValue(Array.isArray(battle.log) && battle.log.length <= 60 && battle.log.every(line => text(line, 500)), 'battle log.');
    const living = battle.enemies.some(enemy => Number((enemy as Record<string, unknown>).hp) > 0);
    requireValue(battle.outcome !== 'won' || !living, 'victory with active opponents.');
    requireValue(battle.outcome !== 'active' || living && Number(battle.hero.hp) > 0, 'active battle without active fighters.');
  }
  return state;
}

export function encodeSave(state: GameState): string {
  const payload = JSON.stringify(state);
  const envelope: SaveEnvelope = {
    format: 'omnis-vir-lupus', version: 1, exportedAt: new Date().toISOString(),
    checksum: hash(payload).toString(16).padStart(8, '0'), state,
  };
  return JSON.stringify(envelope);
}

export function decodeSave(raw: string): GameState {
  if (raw.length > MAX_SAVE_BYTES) throw new Error('That save file is too large.');
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error('That file is not valid JSON.'); }
  requireValue(record(parsed) && parsed.format === 'omnis-vir-lupus', 'this is not an Omnis Vir Lupus save.');
  requireValue(parsed.version === 1, 'this save comes from an unsupported version.');
  requireValue(parsed.checksum === hash(JSON.stringify(parsed.state)).toString(16).padStart(8, '0'), 'checksum mismatch; the file may be damaged.');
  return validateState(parsed.state);
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class SaveConflict extends Error {
  constructor() { super('Another tab changed this save. Reload the latest progress before continuing.'); }
}

export class SaveStore {
  private readonly storage: StorageLike | null;
  private expected: string | null = null;
  private recovered = false;
  warning: string | null = null;
  durable = false;

  constructor(storage: StorageLike | null) { this.storage = storage; }

  load(): GameState | null {
    this.warning = null;
    this.durable = false;
    this.recovered = false;
    if (!this.storage) {
      this.warning = 'Browser storage is unavailable. Keep this tab open and export your save before leaving.';
      return null;
    }
    try {
      const raw = this.storage.getItem(SAVE_KEY);
      this.expected = raw;
      if (!raw) return null;
      try {
        const state = decodeSave(raw);
        this.durable = true;
        return state;
      } catch {
        const backup = this.storage.getItem(BACKUP_KEY);
        if (backup) {
          const state = decodeSave(backup);
          this.warning = 'The latest save was damaged. Your previous valid checkpoint has been recovered.';
          this.recovered = true;
          return state;
        }
        this.warning = 'The saved data could not be read. It has been preserved. Import a valid backup to recover it.';
        return null;
      }
    } catch {
      this.warning = 'Browser storage could not be read. Export your progress before leaving.';
      return null;
    }
  }

  /** Call under a Web Lock in browsers to make the compare-and-write atomic. */
  write(state: GameState, replace = false): boolean {
    if (!this.storage) {
      this.warning = 'Progress is in memory only. Export a backup before closing this tab.';
      this.durable = false;
      return false;
    }
    try {
      const current = this.storage.getItem(SAVE_KEY);
      if (!replace && current !== this.expected) throw new SaveConflict();
      const raw = encodeSave(state);
      if (raw.length > MAX_SAVE_BYTES) throw new Error('Save exceeds the storage limit.');
      if (current && !this.recovered) {
        try {
          decodeSave(current);
          this.storage.setItem(BACKUP_KEY, current);
        } catch { /* Keep a previous valid backup if the main record is corrupt. */ }
      }
      this.storage.setItem(SAVE_KEY, raw);
      if (this.storage.getItem(SAVE_KEY) !== raw) throw new Error('Storage did not retain the save.');
      this.expected = raw;
      this.recovered = false;
      this.durable = true;
      this.warning = null;
      return true;
    } catch (error) {
      if (error instanceof SaveConflict) throw error;
      this.durable = false;
      this.warning = 'Progress could not be saved on this device. Export a backup before closing this tab.';
      return false;
    }
  }

  /** A valid import is checked before any existing checkpoint is touched. */
  import(raw: string): GameState {
    const state = decodeSave(raw);
    if (!this.write(state, true)) throw new Error(this.warning ?? 'Could not store the imported save.');
    return state;
  }

  previous(): GameState {
    const raw = this.storage?.getItem(BACKUP_KEY);
    if (!raw) throw new Error('No previous checkpoint is available.');
    return decodeSave(raw);
  }
}
