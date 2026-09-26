export type Origin = 'red' | 'gold' | 'obsidian';
export type Need = 'nourishment' | 'rest' | 'resolve' | 'connection';
export type Element = 'kinetic' | 'solar' | 'frost' | 'shock' | 'void';
export type Slot = 'weapon' | 'armor' | 'relic';
export type Region = 'hollow' | 'mine' | 'citadel' | 'tundra' | 'forest' | 'desert' | 'city' | 'ship' | 'moon';
export type View = 'camp' | 'world' | 'character' | 'inventory' | 'journal' | 'market';
export type Difficulty = 'story' | 'standard' | 'veteran';
export type Status = 'burn' | 'bleed' | 'weaken' | 'regen';

export interface Stats {
  maxHp: number;
  maxFocus: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  kind: Slot | 'consumable' | 'material';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  level: number;
  price: number;
  stats?: Partial<Stats>;
  element?: Element;
  color: string;
  shape?: 'blade' | 'axe' | 'spear' | 'razor';
  effect?: 'heal' | 'focus' | 'cleanse' | 'revive' | 'food';
  amount?: number;
}

export interface Ability {
  id: string;
  name: string;
  description: string;
  level: number;
  cost: number;
  power: number;
  element: Element;
  target: 'one' | 'all' | 'self';
  hits: number;
  kind: 'attack' | 'heal' | 'guard';
  origin?: Origin;
  status?: Status;
  statusTurns?: number;
  icon: string;
}

export interface EnemyDef {
  id: string;
  name: string;
  description: string;
  family: 'soldier' | 'hound' | 'drone' | 'knight' | 'beast' | 'oracle' | 'titan';
  region: Region;
  color: string;
  weakness: Element[];
  hp: number;
  attack: number;
  defense: number;
  shield: number;
  boss?: boolean;
  pattern: IntentType[];
  status?: Status;
  drop?: string;
}

export type IntentType = 'strike' | 'heavy' | 'guard' | 'charge' | 'heal' | 'afflict' | 'flurry';

export interface Enemy {
  uid: string;
  id: string;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  shield: number;
  maxShield: number;
  broken: number;
  charged: boolean;
  guarding: boolean;
  statuses: Partial<Record<Status, number>>;
  intent: IntentType;
}

export interface CombatEvent {
  kind: 'cast' | 'hit' | 'heal' | 'guard' | 'break' | 'status' | 'defeat' | 'victory' | 'focus' | 'miss';
  source: string;
  target: string;
  text: string;
  amount?: number;
  element?: Element;
  critical?: boolean;
}

export interface Battle {
  id: string;
  missionId: string;
  node: number;
  round: number;
  enemies: Enemy[];
  hero: Stats & { hp: number; focus: number; statuses: Partial<Record<Status, number>> };
  outcome: 'active' | 'won' | 'lost' | 'fled';
  companionCooldown: number;
  boost: number;
  rng: number;
  rewardsClaimed: boolean;
  log: string[];
  boss: boolean;
}

export type Action =
  | { type: 'ability'; id: string; target: string; boosted?: boolean }
  | { type: 'guard' }
  | { type: 'item'; id: string }
  | { type: 'companion'; target: string }
  | { type: 'flee' };

export interface Choice {
  id: string;
  label: string;
  detail: string;
  response: string;
  virtue: 'mercy' | 'defiance' | 'ambition';
  reward?: { credits?: number; item?: string; quantity?: number };
}

export interface StoryNode {
  kind: 'story' | 'choice' | 'battle' | 'cache' | 'rest' | 'explore';
  title: string;
  text: string;
  speaker?: string;
  choices?: Choice[];
  enemies?: string[];
  boss?: boolean;
  reward?: { credits?: number; item?: string; quantity?: number };
}

export interface Mission {
  id: string;
  chapter: number;
  index: number;
  title: string;
  subtitle: string;
  location: string;
  region: Region;
  level: number;
  minutes: number;
  nodes: StoryNode[];
  reward: { xp: number; credits: number; item?: string };
  side?: boolean;
}

export interface Chapter {
  id: number;
  title: string;
  subtitle: string;
  region: Region;
  level: number;
  color: string;
  boss: string;
  enemyPool: string[];
  missions: [string, string, string, string];
  objectives: [string, string, string, string];
  opening: string;
  ending: string;
}

export interface Companion {
  id: string;
  name: string;
  color: Origin;
  role: string;
  description: string;
  unlock: number;
  skill: string;
  type: 'heal' | 'attack' | 'break';
  lines: string[];
}

export interface Expedition {
  missionId: string;
  node: number;
  choices: Record<string, string>;
  resolved: number[];
  startedAt: number;
}

export interface Chronicle {
  id: string;
  title: string;
  text: string;
  at: number;
}

export interface Settings {
  sound: boolean;
  music: boolean;
  volume: number;
  reducedMotion: boolean;
  difficulty: Difficulty;
  battleSpeed: 1 | 2;
  textSize: 'normal' | 'large';
}

export interface GameState {
  schema: 1;
  id: string;
  name: string;
  origin: Origin;
  carved: boolean;
  createdAt: number;
  updatedAt: number;
  playSeconds: number;
  lastCareTick: number;
  xp: number;
  credits: number;
  hp: number;
  focus: number;
  needs: Record<Need, number>;
  inventory: Record<string, number>;
  equipment: Record<Slot, string | null>;
  upgrades: Record<string, number>;
  completed: string[];
  choices: Record<string, string>;
  virtues: Record<'mercy' | 'defiance' | 'ambition', number>;
  expedition: Expedition | null;
  battle: Battle | null;
  companion: string;
  bonds: Record<string, number>;
  journal: Chronicle[];
  bestiary: Record<string, number>;
  achievements: string[];
  training: number;
  careActions: number;
  victories: number;
  defeats: number;
  hunts: number;
  ending: string | null;
  tutorialSeen: boolean;
  settings: Settings;
  rng: number;
}

export interface SaveEnvelope {
  format: 'omnis-vir-lupus';
  version: 1;
  exportedAt: string;
  checksum: string;
  state: GameState;
}
