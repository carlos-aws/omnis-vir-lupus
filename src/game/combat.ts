import { ABILITY_MAP } from '../data/abilities.ts';
import { ENEMY_MAP } from '../data/enemies.ts';
import { ITEM_MAP } from '../data/items.ts';
import { COMPANIONS } from '../data/origins.ts';
import { clamp, hash, random } from './math.ts';
import { abilitiesFor, activeMission, activeNode, addItem, checkAchievements, consumeItem, gainXp, statsOf } from './state.ts';
import type { Action, Battle, CombatEvent, Enemy, GameState, IntentType, Status } from './types.ts';

export const INTENTS: Record<IntentType, { name: string; description: string; icon: string }> = {
  strike: { name: 'Attack', description: 'A standard attack. Guard or break to reduce the damage.', icon: 'sword' },
  heavy: { name: 'Heavy attack', description: 'A powerful blow. Guard or break their shield now.', icon: 'axe' },
  guard: { name: 'Fortify', description: 'Will brace and restore a shield point.', icon: 'shield' },
  charge: { name: 'Charging', description: 'Preparing a stronger attack. A shield break cancels the charge.', icon: 'flame' },
  heal: { name: 'Recover', description: 'Will recover some health. A break interrupts it.', icon: 'heart' },
  afflict: { name: 'Affliction', description: 'A damaging attack with a lasting status effect.', icon: 'eclipse' },
  flurry: { name: 'Flurry', description: 'Two quick attacks. Guard protects against both.', icon: 'swords' },
};

export function createBattle(state: GameState): Battle {
  const mission = activeMission(state);
  const node = activeNode(state);
  const expedition = state.expedition;
  if (!mission || !node || !expedition || node.kind !== 'battle' || !node.enemies) throw new Error('There is no encounter here.');
  if (state.battle) throw new Error('An encounter is already in progress.');
  if (expedition.resolved.includes(expedition.node)) throw new Error('This encounter has already been cleared.');
  const difficulty = state.settings.difficulty;
  const modifier = difficulty === 'story' ? 0.72 : difficulty === 'veteran' ? 1.2 : 1;
  // Standard encounters allow shield breaks, status effects, and charge cycles
  // to develop. Story mode keeps the shorter encounters.
  const endurance = difficulty === 'story' ? 1 : 1.65;
  const stats = statsOf(state);
  const enemies = node.enemies.map((id, index): Enemy => {
    const definition = ENEMY_MAP[id];
    if (!definition) throw new Error(`Unknown opponent: ${id}`);
    const level = mission.level;
    const hp = Math.round(definition.hp * (1 + level * 0.32) * modifier * endurance);
    return {
      uid: `enemy-${index}`, id, name: definition.name, level, hp, maxHp: hp,
      attack: Math.round(definition.attack * (1 + level * 0.15) * modifier),
      defense: Math.round(definition.defense * (1 + level * 0.12)),
      shield: definition.shield, maxShield: definition.shield, broken: 0,
      charged: false, guarding: false, statuses: {}, intent: definition.pattern[0],
    };
  });
  const route = expedition.choices[`${mission.id}:1`];
  const opening = expedition.node === mission.nodes.findIndex(step => step.kind === 'battle');
  const battle: Battle = {
    id: `${mission.id}:${expedition.node}`, missionId: mission.id, node: expedition.node,
    round: 1, enemies, hero: { ...stats, hp: clamp(state.hp, 1, stats.maxHp), focus: clamp(state.focus, 0, stats.maxFocus), statuses: {} },
    outcome: 'active', companionCooldown: 0, boost: route === 'overlook' && opening ? 2 : 1,
    rng: hash(`${state.rng}:${mission.id}:${expedition.node}`) || 1,
    rewardsClaimed: false, log: ['The encounter begins. Choose your opening.'], boss: Boolean(node.boss),
  };
  state.battle = battle;
  return battle;
}

const living = (battle: Battle): Enemy[] => battle.enemies.filter(enemy => enemy.hp > 0);

/** Resolve a complete turn before presentation. UI animation never owns rules. */
export function act(state: GameState, action: Action): CombatEvent[] {
  const currentBattle = state.battle;
  if (!currentBattle || currentBattle.outcome !== 'active') throw new Error('This encounter is not awaiting an action.');
  const battle: Battle = currentBattle;
  // Validate the entire action before consuming resources or rolling randomness.
  const available = abilitiesFor(state);
  if (action.type === 'ability') {
    const ability = available.find(value => value.id === action.id);
    if (!ability) throw new Error('That ability has not been learned.');
    if (battle.hero.focus < ability.cost) throw new Error('Not enough focus. Strike or guard to recover.');
    if (ability.target === 'one' && !living(battle).some(enemy => enemy.uid === action.target)) throw new Error('Choose a living target.');
    if (action.boosted && battle.boost < 3) throw new Error('Burst requires three charges.');
  }
  if (action.type === 'item') {
    const item = ITEM_MAP[action.id];
    if (!item || item.kind !== 'consumable' || item.effect === 'food' || !item.effect) throw new Error('That supply cannot be used in battle.');
    if (!state.inventory[action.id]) throw new Error('You have no more of that supply.');
    if (item.effect === 'heal' && battle.hero.hp >= battle.hero.maxHp) throw new Error('Health is already full.');
    if (item.effect === 'focus' && battle.hero.focus >= battle.hero.maxFocus) throw new Error('Focus is already full.');
  }
  if (action.type === 'companion') {
    if (battle.companionCooldown > 0) throw new Error('Your companion needs time to recover.');
    if (!living(battle).some(enemy => enemy.uid === action.target)) throw new Error('Choose a living target.');
  }
  const events: CombatEvent[] = [];
  let guarding = false;
  const emit = (event: CombatEvent): void => { events.push(event); };
  const hero = battle.hero;
  const initialBroken = new Set(battle.enemies.filter(enemy => enemy.broken > 0).map(enemy => enemy.uid));
  const newBreaks = new Set<string>();

  function shieldHit(enemy: Enemy, points: number): void {
    if (enemy.broken || enemy.hp <= 0 || points <= 0) return;
    enemy.shield = Math.max(0, enemy.shield - points);
    if (enemy.shield === 0) {
      enemy.broken = 1;
      enemy.charged = false;
      enemy.guarding = false;
      newBreaks.add(enemy.uid);
      emit({ kind: 'break', source: 'hero', target: enemy.uid, text: `${enemy.name} is broken! Their next action is lost.` });
    }
  }

  function hit(enemy: Enemy, power: number, element: CombatEvent['element'], forceBreak = false, boosted = false, source = 'hero'): void {
    if (enemy.hp <= 0) return;
    const weak = element ? ENEMY_MAP[enemy.id].weakness.includes(element) : false;
    const critical = random(battle) < (state.origin === 'gold' ? 0.15 : 0.1);
    const variance = 0.92 + random(battle) * 0.16;
    const weakened = hero.statuses.weaken ? 0.72 : 1;
    const damage = Math.max(1, Math.round(
      (hero.attack * power * weakened - enemy.defense * 0.5)
      * variance * (weak ? 1.3 : 1) * (enemy.broken ? 1.75 : 1)
      * (enemy.guarding ? 0.6 : 1) * (critical ? 1.45 : 1) * (boosted ? 1.85 : 1),
    ));
    enemy.hp = Math.max(0, enemy.hp - damage);
    emit({ kind: 'hit', source, target: enemy.uid, amount: damage, element, critical, text: `${damage}${weak ? ' · weak' : ''}${critical ? ' · critical' : ''}` });
    if (enemy.hp > 0) shieldHit(enemy, forceBreak ? 1 : weak ? 1 : 0);
    else emit({ kind: 'defeat', source, target: enemy.uid, text: `${enemy.name} falls.` });
  }

  if (action.type === 'ability') {
    const ability = ABILITY_MAP[action.id];
    emit({ kind: 'cast', source: 'hero', target: action.target, text: ability.name, element: ability.element });
    hero.focus -= ability.cost;
    if (action.boosted) battle.boost -= 3;
    const element = ability.id === 'strike' ? ITEM_MAP[state.equipment.weapon ?? '']?.element ?? 'kinetic' : ability.element;
    if (ability.kind === 'heal') {
      const amount = Math.round(hero.maxHp * ability.power * (state.origin === 'red' ? 1.12 : 1) * (action.boosted ? 1.5 : 1));
      hero.hp = Math.min(hero.maxHp, hero.hp + amount);
      if (ability.status) hero.statuses[ability.status] = ability.statusTurns ?? 3;
      emit({ kind: 'heal', source: 'hero', target: 'hero', amount, element, text: `${ability.name} restores ${amount} health.` });
    } else {
      const targets = ability.target === 'all' ? living(battle) : living(battle).filter(enemy => enemy.uid === action.target);
      for (const enemy of targets) {
        for (let n = 0; n < ability.hits; n++) hit(enemy, ability.power, element, ability.id === 'sunder', action.boosted);
        if (enemy.hp > 0 && ability.status) {
          enemy.statuses[ability.status] = ability.statusTurns ?? 2;
          emit({ kind: 'status', source: 'hero', target: enemy.uid, text: `${enemy.name}: ${ability.status}`, element });
        }
      }
    }
    if (ability.id === 'strike') hero.focus = Math.min(hero.maxFocus, hero.focus + 7);
  } else if (action.type === 'guard') {
    guarding = true;
    const restored = Math.round(hero.maxFocus * 0.25);
    hero.focus = Math.min(hero.maxFocus, hero.focus + restored);
    hero.hp = Math.min(hero.maxHp, hero.hp + Math.round(hero.maxHp * 0.07));
    emit({ kind: 'guard', source: 'hero', target: 'hero', text: `Guard · damage reduced by 70%, +${restored} focus.` });
  } else if (action.type === 'item') {
    const item = ITEM_MAP[action.id];
    consumeItem(state, action.id);
    const amount = Math.round((item.effect === 'focus' ? hero.maxFocus : hero.maxHp) * (item.amount ?? 0));
    if (item.effect === 'focus') hero.focus = Math.min(hero.maxFocus, hero.focus + amount);
    else hero.hp = Math.min(hero.maxHp, hero.hp + amount);
    if (item.effect === 'cleanse') hero.statuses = {};
    emit({ kind: item.effect === 'focus' ? 'focus' : 'heal', source: 'hero', target: 'hero', amount, text: `${item.name} · +${amount} ${item.effect === 'focus' ? 'focus' : 'health'}.` });
  } else if (action.type === 'companion') {
    const companion = COMPANIONS.find(value => value.id === state.companion)!;
    const bond = 1 + (state.bonds[companion.id] ?? 0) / 200;
    battle.companionCooldown = 4;
    if (companion.type === 'heal') {
      const amount = Math.round(hero.maxHp * 0.3 * bond);
      hero.hp = Math.min(hero.maxHp, hero.hp + amount);
      hero.statuses = {};
      emit({ kind: 'heal', source: 'companion', target: 'hero', amount, text: `${companion.name}: ${companion.skill} · +${amount} HP and cleanse.` });
    } else {
      const enemy = living(battle).find(value => value.uid === action.target)!;
      hit(enemy, (companion.type === 'attack' ? 1.65 : 0.9) * bond, companion.type === 'attack' ? 'frost' : 'shock', false, false, 'companion');
      if (companion.type === 'break') shieldHit(enemy, 2);
      emit({ kind: 'status', source: 'companion', target: enemy.uid, text: `${companion.name} · ${companion.skill}` });
    }
  } else if (action.type === 'flee') {
    battle.outcome = 'fled';
    state.hp = Math.max(1, hero.hp);
    state.focus = hero.focus;
    emit({ kind: 'miss', source: 'hero', target: 'hero', text: 'You withdraw safely. The route remains uncleared.' });
    return events;
  }

  // Conditions hurt before enemy actions. A broken enemy loses this round,
  // then remains vulnerable through the next player action.
  for (const enemy of living(battle)) {
    for (const status of ['burn', 'bleed'] as const) {
      if (enemy.statuses[status]) {
        const amount = Math.max(1, Math.round(enemy.maxHp * (ENEMY_MAP[enemy.id].boss ? 0.028 : 0.055)));
        enemy.hp = Math.max(0, enemy.hp - amount);
        emit({ kind: 'hit', source: status, target: enemy.uid, amount, element: status === 'burn' ? 'solar' : 'kinetic', text: `${enemy.name} · ${status} ${amount}` });
      }
    }
    if (enemy.hp <= 0) continue;
    if (enemy.broken > 0) {
      emit({ kind: 'miss', source: enemy.uid, target: enemy.uid, text: `${enemy.name} cannot act while broken.` });
    } else {
      const intent = enemy.intent;
      if (intent === 'charge') {
        enemy.charged = true;
        emit({ kind: 'status', source: enemy.uid, target: enemy.uid, text: `${enemy.name} charges a devastating attack.` });
      } else if (intent === 'guard') {
        enemy.guarding = true;
        enemy.shield = Math.min(enemy.maxShield, enemy.shield + 1);
        emit({ kind: 'guard', source: enemy.uid, target: enemy.uid, text: `${enemy.name} fortifies · +1 shield.` });
      } else if (intent === 'heal') {
        const amount = Math.round(enemy.maxHp * 0.08);
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + amount);
        emit({ kind: 'heal', source: enemy.uid, target: enemy.uid, amount, text: `${enemy.name} recovers ${amount} health.` });
      } else {
        enemy.guarding = false;
        const hits = intent === 'flurry' ? 2 : 1;
        for (let n = 0; n < hits; n++) {
          const power = intent === 'heavy' ? 1.5 : intent === 'flurry' ? 0.65 : 1;
          const amount = Math.max(1, Math.round(
            (enemy.attack * power - hero.defense * 0.55) * (0.92 + random(battle) * 0.16)
            * (enemy.statuses.weaken ? 0.7 : 1) * (enemy.charged ? 1.75 : 1) * (guarding ? 0.3 : 1),
          ));
          hero.hp = Math.max(0, hero.hp - amount);
          emit({ kind: 'hit', source: enemy.uid, target: 'hero', amount, element: intent === 'heavy' ? 'solar' : 'kinetic', text: `${enemy.name} · ${amount} damage${guarding ? ' guarded' : ''}` });
          if (hero.hp === 0) break;
        }
        enemy.charged = false;
        if (intent === 'afflict' && !guarding) {
          const status = ENEMY_MAP[enemy.id].status ?? 'weaken';
          hero.statuses[status] = 3;
          emit({ kind: 'status', source: enemy.uid, target: 'hero', text: `${state.name} suffers ${status}.` });
        }
      }
    }
    if (hero.hp === 0) break;
  }

  for (const status of Object.keys(hero.statuses) as Status[]) {
    if (!hero.statuses[status] || hero.hp <= 0) continue;
    if (status === 'regen') {
      const amount = Math.round(hero.maxHp * 0.065);
      hero.hp = Math.min(hero.maxHp, hero.hp + amount);
      emit({ kind: 'heal', source: 'regen', target: 'hero', amount, text: `Regeneration · +${amount}` });
    } else if (status === 'burn' || status === 'bleed') {
      const amount = Math.max(1, Math.round(hero.maxHp * 0.035));
      // Damage-over-time cannot kill outside an active fight.
      hero.hp = Math.max(living(battle).length ? 0 : 1, hero.hp - amount);
      emit({ kind: 'hit', source: status, target: 'hero', amount, text: `${status} · ${amount}` });
    }
    hero.statuses[status]!--;
    if (!hero.statuses[status]) delete hero.statuses[status];
  }

  for (const enemy of battle.enemies) {
    for (const status of Object.keys(enemy.statuses) as Status[]) {
      enemy.statuses[status]!--;
      if (!enemy.statuses[status]) delete enemy.statuses[status];
    }
    if (initialBroken.has(enemy.uid) && !newBreaks.has(enemy.uid)) {
      enemy.broken = 0;
      enemy.shield = enemy.maxShield;
    }
    const pattern = ENEMY_MAP[enemy.id].pattern;
    enemy.intent = pattern[battle.round % pattern.length];
  }
  battle.boost = Math.min(3, battle.boost + 1);
  battle.companionCooldown = Math.max(0, battle.companionCooldown - 1);
  battle.round++;
  if (hero.hp <= 0) {
    battle.outcome = 'lost';
    emit({ kind: 'defeat', source: 'enemy', target: 'hero', text: 'Your companion pulls you out. This is a setback, not an ending.' });
  } else if (living(battle).length === 0) {
    battle.outcome = 'won';
    emit({ kind: 'victory', source: 'hero', target: 'all', text: 'The route is clear. You are still here.' });
  }
  state.hp = hero.hp;
  state.focus = hero.focus;
  battle.log = [...battle.log, ...events.map(event => event.text)].slice(-60);
  return events;
}

export function claimBattle(state: GameState): { xp: number; credits: number; levels: number; loot: string[] } {
  const battle = state.battle;
  if (!battle || battle.outcome !== 'won') throw new Error('There is no victory to claim.');
  if (battle.rewardsClaimed) throw new Error('These rewards have already been claimed.');
  if (!state.expedition || state.expedition.missionId !== battle.missionId || state.expedition.node !== battle.node) throw new Error('The encounter does not match the expedition.');
  battle.rewardsClaimed = true;
  const rewardKey = `${battle.id}:victory`;
  const loot: string[] = [];
  let xp = 0;
  let credits = 0;
  let levels = 0;
  // Retreating from an expedition and repeating a cleared fight cannot farm
  // rewards. Repeatable patrols have a fresh run ID.
  if (!state.choices[rewardKey]) {
    for (const enemy of battle.enemies) {
      const definition = ENEMY_MAP[enemy.id];
      xp += Math.round((24 + enemy.level * 4) * (definition.boss ? 3 : 1));
      credits += Math.round((10 + enemy.level * 1.3) * (definition.boss ? 3 : 1));
      state.bestiary[enemy.id] = (state.bestiary[enemy.id] ?? 0) + 1;
      if (definition.drop && definition.boss) {
        addItem(state, definition.drop);
        loot.push(definition.drop);
      }
    }
    const supply = battle.boss ? 'sunstone' : random(battle) < 0.4 ? 'medkit' : 'alloy';
    addItem(state, supply);
    loot.push(supply);
    state.credits += credits;
    levels = gainXp(state, xp);
    state.victories++;
    state.choices[rewardKey] = 'claimed';
  }
  if (!state.expedition.resolved.includes(battle.node)) state.expedition.resolved.push(battle.node);
  state.hp = Math.max(1, state.hp);
  state.rng = battle.rng;
  state.battle = null;
  checkAchievements(state);
  return { xp, credits, levels, loot };
}

export function recoverBattle(state: GameState): void {
  if (!state.battle || !['lost', 'fled'].includes(state.battle.outcome)) throw new Error('There is no retreat to recover from.');
  if (state.battle.outcome === 'lost') state.defeats++;
  const stats = statsOf(state);
  state.hp = stats.maxHp;
  state.focus = stats.maxFocus;
  state.needs.rest = Math.max(45, state.needs.rest);
  state.battle = null;
  // Expedition remains at the current fight; completed nodes keep rewards.
}
