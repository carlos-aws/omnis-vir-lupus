import type { Ability, Element } from '../game/types.ts';

export const ELEMENTS: Record<Element, { name: string; color: string; icon: string }> = {
  kinetic: { name: 'Kinetic', color: '#c5c4b9', icon: 'sword' },
  solar: { name: 'Solar', color: '#e5a168', icon: 'sun' },
  frost: { name: 'Frost', color: '#8dc7db', icon: 'snow' },
  shock: { name: 'Shock', color: '#c5b0f2', icon: 'bolt' },
  void: { name: 'Void', color: '#b39ac8', icon: 'eclipse' },
};

export const ABILITIES: Ability[] = [
  { id: 'strike', name: 'Strike', description: 'A controlled strike. Uses your weapon’s element and restores 7 focus.', level: 1, cost: 0, power: 1, element: 'kinetic', target: 'one', hits: 1, kind: 'attack', icon: 'sword' },
  { id: 'sunder', name: 'Sunder', description: 'Two precise hits. Each removes a shield point, even without a weakness.', level: 1, cost: 12, power: 0.64, element: 'kinetic', target: 'one', hits: 2, kind: 'attack', icon: 'broken' },
  { id: 'kindle', name: 'Kindle', description: 'A solar burst that burns for three rounds.', level: 3, cost: 14, power: 1.35, element: 'solar', target: 'one', hits: 1, kind: 'attack', status: 'burn', statusTurns: 3, icon: 'flame' },
  { id: 'winter-bite', name: 'Winter bite', description: 'A frost-edged blow that weakens an enemy’s attacks.', level: 5, cost: 14, power: 1.3, element: 'frost', target: 'one', hits: 1, kind: 'attack', status: 'weaken', statusTurns: 2, icon: 'snow' },
  { id: 'pulse', name: 'Pulse arc', description: 'Chain a shock pulse through every enemy.', level: 8, cost: 23, power: 1.0, element: 'shock', target: 'all', hits: 1, kind: 'attack', icon: 'bolt' },
  { id: 'second-wind', name: 'Second wind', description: 'Recover 32% health and regenerate for three rounds.', level: 10, cost: 20, power: 0.32, element: 'solar', target: 'self', hits: 1, kind: 'heal', status: 'regen', statusTurns: 3, icon: 'heart' },
  { id: 'red-resolve', name: 'Mineborn fury', description: 'Three kinetic strikes. A memory no Carving can take.', level: 12, cost: 22, power: 0.65, element: 'kinetic', target: 'one', hits: 3, kind: 'attack', origin: 'red', icon: 'pickaxe' },
  { id: 'gold-gambit', name: 'Sovereign feint', description: 'Two solar strikes that leave an opponent weakened.', level: 12, cost: 22, power: 0.85, element: 'solar', target: 'one', hits: 2, kind: 'attack', origin: 'gold', status: 'weaken', statusTurns: 3, icon: 'crown' },
  { id: 'ice-oath', name: 'Oath of winter', description: 'A sweeping frost attack against all enemies.', level: 12, cost: 22, power: 1.45, element: 'frost', target: 'all', hits: 1, kind: 'attack', origin: 'obsidian', icon: 'axe' },
  { id: 'nightfall', name: 'Nightfall', description: 'Void energy cuts beneath the armor and inflicts bleed.', level: 18, cost: 24, power: 1.9, element: 'void', target: 'one', hits: 1, kind: 'attack', status: 'bleed', statusTurns: 3, icon: 'eclipse' },
  { id: 'razor-rain', name: 'Razor rain', description: 'A pair of sweeping kinetic strikes against the whole formation.', level: 24, cost: 32, power: 0.8, element: 'kinetic', target: 'all', hits: 2, kind: 'attack', icon: 'swords' },
  { id: 'sunlance', name: 'Sunlance', description: 'Condense a star’s fury into one devastating solar hit.', level: 30, cost: 30, power: 2.65, element: 'solar', target: 'one', hits: 1, kind: 'attack', status: 'burn', statusTurns: 4, icon: 'sun' },
  { id: 'whiteout', name: 'Whiteout', description: 'A frost storm weakens an entire enemy line.', level: 36, cost: 36, power: 1.7, element: 'frost', target: 'all', hits: 1, kind: 'attack', status: 'weaken', statusTurns: 3, icon: 'snow' },
  { id: 'thunderhead', name: 'Thunderhead', description: 'Three shock strikes. Exceptional at opening armored targets.', level: 42, cost: 34, power: 0.95, element: 'shock', target: 'one', hits: 3, kind: 'attack', icon: 'bolt' },
  { id: 'iron-heart', name: 'Iron heart', description: 'Recover 55% health and regenerate for four rounds.', level: 48, cost: 32, power: 0.55, element: 'solar', target: 'self', hits: 1, kind: 'heal', status: 'regen', statusTurns: 4, icon: 'heart' },
  { id: 'event-horizon', name: 'Event horizon', description: 'A collapsing void field strikes every enemy twice.', level: 55, cost: 48, power: 1.15, element: 'void', target: 'all', hits: 2, kind: 'attack', icon: 'eclipse' },
  { id: 'wolf-song', name: 'Wolf song', description: 'Four kinetic cuts, each carrying the weight of a promise.', level: 62, cost: 42, power: 0.9, element: 'kinetic', target: 'one', hits: 4, kind: 'attack', icon: 'wolf' },
  { id: 'daybreak', name: 'Daybreak', description: 'Three waves of solar fire tear through the opposing line.', level: 70, cost: 58, power: 1.05, element: 'solar', target: 'all', hits: 3, kind: 'attack', icon: 'sun' },
  { id: 'omnis-vir-lupus', name: 'Omnis Vir Lupus', description: 'Five void strikes. Every life you carried. Every chain you broke.', level: 78, cost: 65, power: 1.1, element: 'void', target: 'one', hits: 5, kind: 'attack', icon: 'wolf' },
];

export const ABILITY_MAP = Object.fromEntries(ABILITIES.map(ability => [ability.id, ability])) as Record<string, Ability>;
