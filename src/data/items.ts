import type { Item, Slot } from '../game/types.ts';

const equipment: Item[] = [
  { id: 'mining-blade', name: 'Helium cutter', description: 'A mining tool with a grip worn smooth by two generations.', kind: 'weapon', rarity: 'common', level: 1, price: 35, stats: { attack: 5 }, element: 'kinetic', color: '#bc775d', shape: 'blade' },
  { id: 'practice-razor', name: 'Academy razor', description: 'Its edge is blunted. Its lessons were not.', kind: 'weapon', rarity: 'common', level: 1, price: 35, stats: { attack: 5 }, element: 'kinetic', color: '#c3ac74', shape: 'razor' },
  { id: 'ice-axe', name: 'Clan handaxe', description: 'Iron, leather, and the first promise you ever made.', kind: 'weapon', rarity: 'common', level: 1, price: 35, stats: { attack: 5 }, element: 'kinetic', color: '#94a9b7', shape: 'axe' },
  { id: 'work-clothes', name: 'Mine runner’s coat', description: 'Patched at the elbows. A red thread at the heart.', kind: 'armor', rarity: 'common', level: 1, price: 30, stats: { defense: 3, maxHp: 12 }, color: '#925146' },
  { id: 'academy-coat', name: 'House uniform', description: 'The crest has been carefully unstitched.', kind: 'armor', rarity: 'common', level: 1, price: 30, stats: { defense: 3, maxHp: 12 }, color: '#9c8955' },
  { id: 'fur-mantle', name: 'Snow-wolf mantle', description: 'The warmth of a home that is no longer safe.', kind: 'armor', rarity: 'common', level: 1, price: 30, stats: { defense: 3, maxHp: 12 }, color: '#7e8f9b' },
];

const tiers = [
  { level: 5, title: 'Salvaged', color: '#a7a9a3', rarity: 'common', armor: 'Scavenger’s leathers', relic: 'Broken sigil' },
  { level: 12, title: 'Tempered', color: '#91aa92', rarity: 'uncommon', armor: 'Carver’s field coat', relic: 'Glass sun' },
  { level: 22, title: 'Howler', color: '#bc9a60', rarity: 'uncommon', armor: 'Wolfguard brigandine', relic: 'Pack token' },
  { level: 32, title: 'Stormforged', color: '#83abc8', rarity: 'rare', armor: 'Stormweave plate', relic: 'Ion heart' },
  { level: 42, title: 'Eclipse', color: '#b2a0cd', rarity: 'rare', armor: 'Nightfall carapace', relic: 'Eclipse prism' },
  { level: 52, title: 'Praetorian', color: '#b7ac88', rarity: 'epic', armor: 'Commandant’s aegis', relic: 'Unbroken oath' },
  { level: 65, title: 'Dawnfire', color: '#dcaa73', rarity: 'epic', armor: 'Dawn sentinel plate', relic: 'Morning ember' },
  { level: 76, title: 'Liberator’s', color: '#efd394', rarity: 'legendary', armor: 'Mantle of the free', relic: 'The first sunrise' },
] as const;

for (const [index, tier] of tiers.entries()) {
  const base = 5 + tier.level * 0.8;
  const weapons = [
    { key: 'razor', name: `${tier.title} razor`, shape: 'razor', element: index % 2 ? 'solar' : 'kinetic', attack: base, focus: 0, desc: 'A flexible dueling edge. Precise, quick, unforgiving.' },
    { key: 'axe', name: `${tier.title} war axe`, shape: 'axe', element: index % 2 ? 'frost' : 'kinetic', attack: base + 3, focus: -3, desc: 'A heavy head balanced for deliberate, armor-breaking blows.' },
    { key: 'spear', name: `${tier.title} pulse lance`, shape: 'spear', element: index % 2 ? 'void' : 'shock', attack: base - 2, focus: 8, desc: 'A conductor wound around a sharpened promise.' },
  ] as const;
  for (const weapon of weapons) equipment.push({
    id: `t${index + 1}-${weapon.key}`, name: weapon.name, description: weapon.desc,
    kind: 'weapon', rarity: tier.rarity, level: tier.level, price: Math.round(70 + tier.level * 13),
    stats: { attack: Math.round(weapon.attack), maxFocus: weapon.focus },
    element: weapon.element, color: tier.color, shape: weapon.shape,
  });
  equipment.push({
    id: `t${index + 1}-armor`, name: tier.armor,
    description: ['Made from the useful parts of things that tried to kill you.', 'Flexible reinforcement over a coat made for long journeys.', 'A small wolf is worked into the shoulder. You are not alone.', 'Conductive fibers scatter the light of incoming fire.', 'Dark alloy drinks the light. The seams shine violet.', 'An officer’s protection, without an officer’s leash.', 'Gold over white ceramic. A dawn that refuses to be ornamental.', 'No house crest. No owner’s mark. Only the names you chose to carry.'][index],
    kind: 'armor', rarity: tier.rarity, level: tier.level, price: Math.round(65 + tier.level * 12),
    stats: { defense: Math.round(4 + tier.level * 0.62), maxHp: Math.round(20 + tier.level * 3) }, color: tier.color,
  });
  equipment.push({
    id: `t${index + 1}-relic`, name: tier.relic,
    description: ['A shattered house seal on a plain cord. An ending, worn as a beginning.', 'A child’s idea of sunlight, carried far beneath the ground.', 'Three colors braided together. More useful than a medal.', 'A relay crystal that hums when held near another living heart.', 'An old lens through which even darkness has edges.', 'A promise etched in a language no sovereign owns.', 'A warm shard recovered from the first liberated foundry.', 'A simple piece of glass. Through it, a free world looks back.'][index],
    kind: 'relic', rarity: tier.rarity, level: tier.level, price: Math.round(80 + tier.level * 14),
    stats: { maxFocus: 8 + index * 5, speed: 1 + index, attack: 2 + index * 2 }, color: tier.color,
  });
}

export const ITEMS: Item[] = [
  ...equipment,
  { id: 'medkit', name: 'Field dressing', description: 'Recover 45% of maximum health. Usable in battle or at camp.', kind: 'consumable', rarity: 'common', level: 1, price: 24, effect: 'heal', amount: 0.45, color: '#9fb798' },
  { id: 'trauma-kit', name: 'Trauma kit', description: 'Recover 80% of maximum health.', kind: 'consumable', rarity: 'rare', level: 20, price: 70, effect: 'heal', amount: 0.8, color: '#d2be86' },
  { id: 'focus-tonic', name: 'Focus draught', description: 'Restore 55% of maximum focus.', kind: 'consumable', rarity: 'common', level: 1, price: 22, effect: 'focus', amount: 0.55, color: '#8aaabb' },
  { id: 'antidote', name: 'Purifier', description: 'Clear burn, bleed, and weaken. Restore 15% health.', kind: 'consumable', rarity: 'uncommon', level: 1, price: 18, effect: 'cleanse', amount: 0.15, color: '#b1a4c9' },
  { id: 'ration', name: 'Warm ration', description: 'A real meal. Restore nourishment and a little resolve at camp.', kind: 'consumable', rarity: 'common', level: 1, price: 10, effect: 'food', amount: 40, color: '#bd9168' },
  { id: 'alloy', name: 'Reclaimed alloy', description: 'Spend at the forge to improve an owned weapon, armor, or relic.', kind: 'material', rarity: 'uncommon', level: 1, price: 35, color: '#8895a4' },
  { id: 'sunstone', name: 'Sunstone', description: 'A rare crystal used for the final two forge upgrades.', kind: 'material', rarity: 'rare', level: 1, price: 100, color: '#cfac6f' },
];

export const ITEM_MAP = Object.fromEntries(ITEMS.map(item => [item.id, item])) as Record<string, Item>;
export const SLOTS: Slot[] = ['weapon', 'armor', 'relic'];
export const RARITY_COLORS = { common: '#a5aaa6', uncommon: '#9cb78f', rare: '#8eafd1', epic: '#b69acb', legendary: '#e3bd70' };
