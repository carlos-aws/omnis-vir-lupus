import type { Companion, Origin } from '../game/types.ts';

export const ORIGINS: Record<Origin, {
  name: string; title: string; description: string; trait: string; color: string;
  home: string; weapon: string; armor: string; companion: string; prologue: string; promise: string;
}> = {
  red: {
    name: 'Red', title: 'Born beneath the world.',
    description: 'A young mine runner with dust in your lungs and a forbidden sky in your dreams. Your hands built their empire. They can unmake it.',
    trait: 'Enduring heart · stronger recovery', color: '#d46b50',
    home: 'The buried wards', weapon: 'mining-blade', armor: 'work-clothes', companion: 'mara',
    prologue: 'You know the weight of a full ore cart and the silence of an empty bunk. When your shift discovers a sealed surface elevator, the lie that kept your family underground begins to split. You are sixteen. You have never seen a sunrise.',
    promise: 'Survive the mines. Choose the Carving. Rise as a Gold without surrendering who you are.',
  },
  gold: {
    name: 'Gold', title: 'Raised above the rest.',
    description: 'An heir to a minor house, trained to rule a world you have never had to understand. One order will cost you everything you were promised.',
    trait: 'Disciplined mind · deeper focus', color: '#d6b66b',
    home: 'The aureate spires', weapon: 'practice-razor', armor: 'academy-coat', companion: 'cassian',
    prologue: 'At sixteen, your tutors call mercy an error of calculation. Your first command is supposed to prove them right: escort a convoy of prisoners into a district that officially does not exist. One of the prisoners knows your family name.',
    promise: 'Question your inheritance. Betray your house. Learn what leadership actually costs.',
  },
  obsidian: {
    name: 'Obsidian', title: 'Forged under false gods.',
    description: 'A ward of the polar clans, raised on iron, winter, and stories of gods. Beyond the ice stands a door no prayer can open.',
    trait: 'Winter’s blood · greater vitality', color: '#a6bacb',
    home: 'The white expanse', weapon: 'ice-axe', armor: 'fur-mantle', companion: 'yrsa',
    prologue: 'On your sixteenth winter, the sky priests choose your closest friend for a journey from which no one returns. A broken machine falls through the aurora. Inside, you find a map of the heavens written in a human hand.',
    promise: 'Cross the forbidden ice. Expose the manufactured gods. Give your people a future.',
  },
};

export const GROWTH = [
  { name: 'Ember', level: 1, age: 16, description: 'A life others have already written. A small refusal.' },
  { name: 'Awakened', level: 8, age: 18, description: 'You have seen beyond the walls. The world cannot become small again.' },
  { name: 'Aspirant', level: 18, age: 21, description: 'Skill begins to replace survival. Your choices leave marks.' },
  { name: 'Blade', level: 28, age: 25, description: 'A weapon can have a conscience. Keeping it takes practice.' },
  { name: 'Vanguard', level: 40, age: 30, description: 'People follow you into danger. You learn to bring them back.' },
  { name: 'Commander', level: 52, age: 36, description: 'Victory becomes a question of what you refuse to sacrifice.' },
  { name: 'Praetor', level: 65, age: 44, description: 'Your scars are maps. Your name travels further than you do.' },
  { name: 'Living legend', level: 76, age: 55, description: 'The story belongs to those who live after you. Leave them a better one.' },
] as const;

export const COMPANIONS: Companion[] = [
  {
    id: 'mara', name: 'Mara', color: 'red', role: 'Field medic',
    description: 'A mine surgeon who learned to save lives with whatever the overseers forgot to lock away.',
    unlock: 0, skill: 'Steady hands', type: 'heal',
    lines: [
      'A wound is not a debt. You do not have to earn the right to heal.',
      'When this is finished, I want a room with a window. Nothing grand. Just a window.',
      'You remembered how I take my tea. That matters more than the speeches.',
      'I used to count the people I lost. Now I also count the ones who came home.',
      'Keep the scars if you need them. You do not have to keep the pain.',
    ],
  },
  {
    id: 'cassian', name: 'Cassian', color: 'gold', role: 'Disgraced duelist',
    description: 'An academy prodigy who chose exile over a promotion bought with someone else’s life.',
    unlock: 0, skill: 'Opening gambit', type: 'break',
    lines: [
      'They taught us a hundred ways to win a duel. Not one way to apologize.',
      'I still fold my coat like a servant is going to inspect it. Habits outlive houses.',
      'You can tell me when I sound like them. Especially then.',
      'My father would call this camp beneath me. He never slept so soundly.',
      'I thought honor was something you inherited. Apparently it is daily work.',
    ],
  },
  {
    id: 'yrsa', name: 'Yrsa', color: 'obsidian', role: 'Oathbreaker',
    description: 'A polar pathfinder whose quiet defiance carries further than any war cry.',
    unlock: 0, skill: 'Winter’s answer', type: 'attack',
    lines: [
      'The old gods never answered. You do. That is a better beginning.',
      'There is a word in my language for snow that remembers a footprint. I think of it here.',
      'I did not leave the ice because I hated it. I left because I loved the people on it.',
      'You fight loudly and sleep badly. Tonight we will work on the second problem.',
      'An oath made under a lie is a chain. A promise made freely is a shelter.',
    ],
  },
  {
    id: 'ione', name: 'Ione', color: 'gold', role: 'Signal weaver',
    description: 'A former relay engineer who can turn the empire’s machines against their masters.',
    unlock: 16, skill: 'Blackout pulse', type: 'break',
    lines: [
      'Every secure channel begins with somebody saying it cannot be broken.',
      'I archive the ordinary messages too. Birthdays. Shopping lists. Proof we were here.',
      'I can silence their guns. I cannot tell you what to say afterward.',
      'The network sounds different when no one is afraid to speak.',
    ],
  },
];

export const NEEDS = {
  nourishment: { label: 'Nourishment', short: 'Fed', icon: 'bowl', color: '#c79962' },
  rest: { label: 'Rest', short: 'Rested', icon: 'moon', color: '#849bba' },
  resolve: { label: 'Resolve', short: 'Steady', icon: 'flame', color: '#cd7861' },
  connection: { label: 'Connection', short: 'Connected', icon: 'heart', color: '#9aad86' },
} as const;
