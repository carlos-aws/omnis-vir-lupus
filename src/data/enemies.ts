import type { EnemyDef, Region } from '../game/types.ts';

const enemy = (
  id: string, name: string, family: EnemyDef['family'], region: Region,
  color: string, weakness: EnemyDef['weakness'], pattern: EnemyDef['pattern'],
  description: string, extra: Partial<EnemyDef> = {},
): EnemyDef => ({
  id, name, family, region, color, weakness, pattern, description,
  hp: 54, attack: 14, defense: 5, shield: 2, ...extra,
});

export const ENEMIES: EnemyDef[] = [
  enemy('pit-viper', 'Pit viper', 'beast', 'mine', '#977662', ['frost', 'kinetic'], ['afflict', 'strike', 'strike'], 'A heat-blind burrower that hunts by the vibrations of machinery.', { hp: 43, status: 'bleed', shield: 1 }),
  enemy('mine-drone', 'Survey drone', 'drone', 'mine', '#b99c69', ['shock', 'kinetic'], ['strike', 'charge', 'heavy'], 'It still measures human movement as stolen productivity.', { hp: 45, attack: 12 }),
  enemy('gray-guard', 'Gray enforcer', 'soldier', 'mine', '#8f9a9c', ['solar', 'frost'], ['strike', 'guard', 'heavy'], 'A paid uniform at the wrong end of an unpaid life. Watch the raised shield.', { hp: 60 }),
  enemy('slag-hound', 'Slag hound', 'hound', 'mine', '#b07350', ['frost', 'shock'], ['strike', 'flurry', 'strike'], 'A security animal bred to withstand foundry heat.', { hp: 48, attack: 16, status: 'burn' }),
  enemy('tunnel-stalker', 'Tunnel stalker', 'oracle', 'mine', '#938c72', ['solar', 'kinetic'], ['afflict', 'strike', 'heal'], 'A mercenary who learned every route that does not appear on a map.', { status: 'weaken', hp: 52 }),

  enemy('academy-duelist', 'House duelist', 'knight', 'citadel', '#c9b47c', ['shock', 'kinetic'], ['guard', 'heavy', 'strike'], 'An elegant stance. An expensive blade. A predictable arrogance.', { hp: 67, shield: 3 }),
  enemy('gilt-sentry', 'Gilt sentry', 'soldier', 'citadel', '#baa978', ['frost', 'void'], ['strike', 'strike', 'charge', 'heavy'], 'Ceremonial armor conceals a working pulse weapon.', { hp: 58 }),
  enemy('mirror-drone', 'Mirror drone', 'drone', 'citadel', '#b9c8c7', ['shock', 'void'], ['guard', 'afflict', 'strike'], 'Polished plates scatter targeting light. Its core remains exposed to a pulse.', { defense: 9, status: 'weaken' }),
  enemy('house-assassin', 'House knife', 'oracle', 'citadel', '#af958a', ['solar', 'kinetic'], ['afflict', 'flurry', 'guard'], 'An unmarked contract in a city full of crests.', { hp: 50, attack: 17, status: 'bleed' }),
  enemy('praetor-guard', 'Praetor guard', 'knight', 'citadel', '#d3bf8b', ['void', 'frost'], ['guard', 'charge', 'heavy'], 'Break the formation before the heavy blade falls.', { hp: 75, defense: 9, shield: 3 }),

  enemy('ice-wolf', 'Tundra wolf', 'hound', 'tundra', '#b5c7ca', ['solar', 'kinetic'], ['strike', 'flurry', 'strike'], 'Hunger has no allegiance. Fire breaks its approach.', { hp: 50, attack: 16, shield: 1 }),
  enemy('frost-reaver', 'Frost reaver', 'soldier', 'tundra', '#8bafc0', ['solar', 'shock'], ['strike', 'afflict', 'heavy'], 'A clan warrior guarding a border drawn by someone else.', { status: 'weaken', hp: 65 }),
  enemy('sky-priest', 'Sky priest', 'oracle', 'tundra', '#b8b5c8', ['kinetic', 'void'], ['afflict', 'heal', 'charge', 'heavy'], 'A transmitter hidden beneath ceremonial bone.', { status: 'weaken', hp: 56, shield: 3 }),
  enemy('white-bear', 'White crag bear', 'beast', 'tundra', '#c1c9b7', ['solar', 'shock'], ['strike', 'charge', 'heavy'], 'Its hide is as thick as the winter that shaped it.', { hp: 90, defense: 8, shield: 3 }),
  enemy('ice-automaton', 'Frozen custodian', 'titan', 'tundra', '#90abbf', ['shock', 'solar'], ['guard', 'strike', 'charge', 'heavy'], 'A maintenance machine worshipped as an immortal guardian.', { hp: 83, defense: 10, shield: 3 }),

  enemy('thorn-lurker', 'Thorn lurker', 'beast', 'forest', '#8b9e71', ['solar', 'frost'], ['afflict', 'strike', 'guard'], 'A predator grown to defend a garden no one visits.', { status: 'bleed', hp: 56 }),
  enemy('forest-scout', 'Canopy scout', 'soldier', 'forest', '#90a68a', ['shock', 'kinetic'], ['strike', 'guard', 'flurry'], 'The leaves move against the wind. That is your warning.', { hp: 54, attack: 16 }),
  enemy('razor-wing', 'Razorwing', 'drone', 'forest', '#b4b393', ['frost', 'shock'], ['flurry', 'strike', 'charge'], 'A winged survey engine repurposed for crowd control.', { hp: 46, attack: 16, shield: 1 }),
  enemy('hollow-hound', 'Hollow hound', 'hound', 'forest', '#879688', ['solar', 'void'], ['afflict', 'flurry', 'strike'], 'Old gene work escaped into a newer wilderness.', { hp: 60, status: 'bleed' }),
  enemy('verdant-knight', 'Verdant knight', 'knight', 'forest', '#9fa87c', ['solar', 'void'], ['guard', 'heal', 'heavy'], 'A private guard paid to protect the forest from the people who planted it.', { hp: 75, defense: 8, shield: 3 }),

  enemy('ash-scorpion', 'Ash scorpion', 'beast', 'desert', '#be8e64', ['frost', 'shock'], ['afflict', 'strike', 'heavy'], 'Glass-hard chitin shields a body full of heat.', { hp: 66, defense: 7, status: 'bleed' }),
  enemy('dune-raider', 'Dune raider', 'soldier', 'desert', '#b79a77', ['frost', 'kinetic'], ['flurry', 'guard', 'strike'], 'A convoy uniform worn inside out. Survival has changed its employer.', { hp: 62, attack: 16 }),
  enemy('cinder-drone', 'Cinder drone', 'drone', 'desert', '#d19963', ['shock', 'frost'], ['charge', 'heavy', 'afflict'], 'Its warning siren is a courtesy the designers did not intend.', { hp: 60, status: 'burn' }),
  enemy('glass-stalker', 'Glass stalker', 'oracle', 'desert', '#b59c98', ['kinetic', 'solar'], ['afflict', 'guard', 'flurry'], 'A refractive cloak almost erases the person inside.', { hp: 50, status: 'weaken' }),
  enemy('sand-colossus', 'Sand colossus', 'titan', 'desert', '#b6a07a', ['frost', 'void'], ['guard', 'charge', 'heavy'], 'An industrial loader plated for a war it was never meant to fight.', { hp: 104, attack: 19, shield: 4 }),

  enemy('riot-guard', 'Riot shield', 'soldier', 'city', '#a0a4a7', ['shock', 'void'], ['guard', 'strike', 'heavy'], 'The shield reads PUBLIC SAFETY. Someone has scratched out a word.', { hp: 72, defense: 10, shield: 3 }),
  enemy('pulse-sniper', 'Pulse marksman', 'oracle', 'city', '#ac9295', ['kinetic', 'frost'], ['charge', 'heavy', 'guard'], 'The targeting beam tells you exactly when to interrupt.', { hp: 48, attack: 22, shield: 1 }),
  enemy('hunter-killer', 'Hunter-killer', 'drone', 'city', '#9bafb7', ['shock', 'void'], ['flurry', 'afflict', 'strike'], 'An autonomous weapon with a very human list of targets.', { hp: 62, attack: 17, status: 'burn' }),
  enemy('blood-hound', 'Iron hound', 'hound', 'city', '#ac8279', ['frost', 'solar'], ['afflict', 'flurry', 'strike'], 'Mechanical reinforcement has left it in constant pain.', { hp: 68, attack: 17, status: 'bleed' }),
  enemy('black-knight', 'Black standard', 'knight', 'city', '#9a93a9', ['solar', 'shock'], ['guard', 'heavy', 'afflict'], 'A bannerless officer sent where witnesses are inconvenient.', { hp: 82, defense: 11, status: 'weaken', shield: 3 }),

  enemy('boarding-marine', 'Boarding marine', 'soldier', 'ship', '#95adb3', ['shock', 'frost'], ['strike', 'flurry', 'guard'], 'Magnetic boots, sealed armor, and nowhere to retreat.', { hp: 75, defense: 8 }),
  enemy('vacuum-drone', 'Vacuum wasp', 'drone', 'ship', '#a4c0c1', ['shock', 'kinetic'], ['flurry', 'charge', 'heavy'], 'A maintenance drone with a cutting torch and new instructions.', { hp: 52, attack: 19, status: 'burn' }),
  enemy('bridge-officer', 'Bridge officer', 'oracle', 'ship', '#b1a39d', ['void', 'kinetic'], ['heal', 'afflict', 'heavy'], 'Trained to treat every casualty as a number in a report.', { hp: 64, status: 'weaken', shield: 3 }),
  enemy('hull-breaker', 'Hull breaker', 'titan', 'ship', '#a4aeb5', ['shock', 'void'], ['guard', 'charge', 'heavy'], 'A siege exoskeleton. The deck bends with every step.', { hp: 115, attack: 22, defense: 13, shield: 4 }),
  enemy('null-knight', 'Null knight', 'knight', 'ship', '#aba1c4', ['solar', 'frost'], ['afflict', 'guard', 'flurry'], 'An insulated duelist who fights between the emergency lights.', { hp: 78, defense: 9, status: 'bleed', shield: 3 }),

  enemy('moon-sentinel', 'Lunar sentinel', 'knight', 'moon', '#c4bcac', ['shock', 'void'], ['guard', 'heavy', 'strike'], 'The final line has never needed to retreat. Until now.', { hp: 87, defense: 11, shield: 4 }),
  enemy('ash-oracle', 'Ash oracle', 'oracle', 'moon', '#bc9ebd', ['kinetic', 'solar'], ['afflict', 'heal', 'charge', 'heavy'], 'A strategist who mistakes probability for fate.', { hp: 69, attack: 20, status: 'weaken' }),
  enemy('solar-titan', 'Solar titan', 'titan', 'moon', '#d5bb80', ['frost', 'void'], ['charge', 'heavy', 'guard'], 'A walking reactor built to make surrender look merciful.', { hp: 124, attack: 24, defense: 12, shield: 4 }),
  enemy('eclipse-hound', 'Eclipse hound', 'hound', 'moon', '#b2a0b8', ['solar', 'shock'], ['afflict', 'flurry', 'flurry'], 'It sees electrical activity through solid walls.', { hp: 73, attack: 20, status: 'bleed' }),
  enemy('crown-drone', 'Crown’s eye', 'drone', 'moon', '#d0c393', ['shock', 'kinetic'], ['guard', 'afflict', 'heavy'], 'The last thing a tyrant sees is not always a loyal face.', { hp: 68, attack: 20, status: 'burn', shield: 3 }),

  enemy('warden', 'Warden Vey', 'knight', 'mine', '#c3a77c', ['shock', 'frost'], ['strike', 'charge', 'heavy', 'guard'], 'Keeper of the sealed elevator. He knows exactly what lies above.', { boss: true, hp: 152, attack: 17, defense: 7, shield: 3, drop: 't1-razor' }),
  enemy('houndsman', 'The Houndsman', 'beast', 'forest', '#b69976', ['solar', 'frost'], ['afflict', 'flurry', 'charge', 'heavy'], 'A private hunter paid by the name crossed off his list.', { boss: true, hp: 175, attack: 19, shield: 3, status: 'bleed', drop: 't1-armor' }),
  enemy('carver-guardian', 'The Pale Custodian', 'titan', 'citadel', '#b7c3b9', ['shock', 'void'], ['guard', 'charge', 'heavy', 'heal'], 'An abandoned medical defense system that no longer distinguishes patient from intruder.', { boss: true, hp: 195, attack: 19, defense: 9, shield: 4, drop: 't2-relic' }),
  enemy('house-champion', 'Aureate Champion', 'knight', 'citadel', '#d5ba73', ['frost', 'kinetic'], ['guard', 'flurry', 'charge', 'heavy'], 'A duelist who believes birth is proof enough of worth.', { boss: true, hp: 206, attack: 20, defense: 8, shield: 4, drop: 't2-razor' }),
  enemy('green-matron', 'The Briar Matron', 'beast', 'forest', '#a4ae7d', ['solar', 'shock'], ['afflict', 'heal', 'charge', 'heavy'], 'The last defense of a laboratory garden, alive long after its makers fled.', { boss: true, hp: 216, attack: 20, shield: 4, status: 'bleed', drop: 't3-armor' }),
  enemy('false-god', 'The Voice of Winter', 'oracle', 'tundra', '#b8c4d3', ['solar', 'kinetic'], ['afflict', 'guard', 'charge', 'heavy', 'heal'], 'A priest inside a machine, carrying a god’s voice through stolen speakers.', { boss: true, hp: 225, attack: 21, shield: 4, status: 'weaken', drop: 't3-axe' }),
  enemy('glass-wyrm', 'Glass Wyrm', 'beast', 'desert', '#d0a072', ['frost', 'void'], ['charge', 'heavy', 'afflict', 'flurry'], 'An engineered desert weapon, abandoned but never disarmed.', { boss: true, hp: 240, attack: 22, shield: 4, status: 'burn', drop: 't4-relic' }),
  enemy('iron-prefect', 'The Iron Prefect', 'knight', 'city', '#afb5b9', ['shock', 'void'], ['guard', 'charge', 'heavy', 'flurry'], 'An administrator who outsourced his conscience to a suit of armor.', { boss: true, hp: 258, attack: 23, defense: 11, shield: 5, drop: 't4-armor' }),
  enemy('red-jackal', 'The Red Jackal', 'hound', 'desert', '#c28b78', ['frost', 'solar'], ['flurry', 'afflict', 'guard', 'heavy'], 'A rebellion’s stolen insignia on a mercenary’s attack frame.', { boss: true, hp: 260, attack: 24, shield: 4, status: 'bleed', drop: 't5-razor' }),
  enemy('fleet-executor', 'Fleet Executor', 'titan', 'ship', '#a5bcc5', ['shock', 'frost'], ['charge', 'heavy', 'guard', 'flurry'], 'The flagship’s commander has become part of its weapons system.', { boss: true, hp: 278, attack: 25, defense: 12, shield: 5, drop: 't5-armor' }),
  enemy('veil-sister', 'The Veiled Sister', 'oracle', 'city', '#bd9fc4', ['kinetic', 'solar'], ['afflict', 'heal', 'flurry', 'charge', 'heavy'], 'A broker who sells tomorrow to whoever can pay today.', { boss: true, hp: 282, attack: 25, shield: 5, status: 'weaken', drop: 't6-relic' }),
  enemy('sun-forge', 'Sunforge Engine', 'titan', 'desert', '#ddac69', ['frost', 'void'], ['charge', 'heavy', 'afflict', 'guard'], 'An orbital furnace chained to a targeting computer.', { boss: true, hp: 310, attack: 26, defense: 12, shield: 5, status: 'burn', drop: 't6-spear' }),
  enemy('oath-keeper', 'The Oathkeeper', 'knight', 'citadel', '#d2c18f', ['shock', 'void'], ['guard', 'flurry', 'charge', 'heavy'], 'A former ally who kept the wrong promise for too long.', { boss: true, hp: 316, attack: 27, defense: 12, shield: 5, drop: 't7-armor' }),
  enemy('night-admiral', 'Admiral of Night', 'oracle', 'ship', '#a8a7c6', ['solar', 'frost'], ['afflict', 'guard', 'heal', 'charge', 'heavy'], 'A tactician defending an empire she no longer believes in.', { boss: true, hp: 330, attack: 27, shield: 5, status: 'weaken', drop: 't7-razor' }),
  enemy('crown-titan', 'Crown of Ash', 'titan', 'moon', '#d3bc83', ['frost', 'shock'], ['charge', 'heavy', 'flurry', 'guard'], 'The throne’s last argument: a machine too large to imagine refusing.', { boss: true, hp: 345, attack: 28, defense: 13, shield: 6, drop: 't8-armor' }),
  enemy('sovereign', 'The Last Sovereign', 'knight', 'moon', '#edce91', ['void', 'kinetic'], ['guard', 'afflict', 'flurry', 'charge', 'heavy', 'heal'], 'A ruler who cannot imagine a world that does not need a ruler.', { boss: true, hp: 380, attack: 29, defense: 14, shield: 6, status: 'weaken', drop: 't8-razor' }),
];

export const ENEMY_MAP = Object.fromEntries(ENEMIES.map(value => [value.id, value])) as Record<string, EnemyDef>;
