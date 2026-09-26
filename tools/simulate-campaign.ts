import { ABILITY_MAP } from '../src/data/abilities.ts';
import { pathToFileURL } from 'node:url';
import { ENEMY_MAP } from '../src/data/enemies.ts';
import { ITEMS } from '../src/data/items.ts';
import { campaign, ENDINGS } from '../src/data/story.ts';
import { act, claimBattle, createBattle, recoverBattle } from '../src/game/combat.ts';
import { abilitiesFor, activeNode, advanceNode, buy, care, createGame, equip, levelOf, startMission, statsOf } from '../src/game/state.ts';
import { decodeSave, encodeSave } from '../src/game/storage.ts';
import type { Action, Difficulty, GameState, Origin } from '../src/game/types.ts';

/** A readable tactical policy; uses only normal player actions and resources. */
export function chooseAction(state: GameState): Action {
  const battle = state.battle!;
  const hero = battle.hero;
  const targets = battle.enemies.filter(enemy => enemy.hp > 0);
  const target = targets.reduce((best, enemy) => enemy.hp < best.hp ? enemy : best);
  const hp = hero.hp / hero.maxHp;
  const skills = abilitiesFor(state);
  if (hp < 0.62 && state.companion === 'mara' && !battle.companionCooldown) return { type: 'companion', target: target.uid };
  if (hp < 0.5) {
    const healing = skills.filter(skill => skill.kind === 'heal' && skill.cost <= hero.focus).at(-1);
    if (healing) return { type: 'ability', id: healing.id, target: target.uid };
    if (state.inventory['trauma-kit']) return { type: 'item', id: 'trauma-kit' };
    if (state.inventory.medkit) return { type: 'item', id: 'medkit' };
    if (hp < 0.25) return { type: 'guard' };
  }
  if (hero.focus < hero.maxFocus * 0.18 && state.inventory['focus-tonic']) return { type: 'item', id: 'focus-tonic' };
  if (targets.some(enemy => enemy.charged && enemy.intent === 'heavy') && hp < 0.8) return { type: 'guard' };
  if (state.companion !== 'mara' && !battle.companionCooldown) return { type: 'companion', target: target.uid };
  let best = 'strike';
  let bestTarget = target.uid;
  let bestValue = -1;
  for (const ability of skills) {
    if (ability.kind !== 'attack' || ability.cost > hero.focus) continue;
    for (const candidate of targets) {
      const selected = ability.target === 'all' ? targets : [candidate];
      const value = selected.reduce((sum, enemy) => {
        const weak = ENEMY_MAP[enemy.id].weakness.includes(ability.element);
        const estimate = hero.attack * ability.power * ability.hits * (weak ? 1.3 : 1) * (enemy.broken ? 1.75 : 1);
        const damage = Math.min(enemy.hp + 15, estimate);
        const breakValue = !enemy.broken && (weak || ability.id === 'sunder') ? Math.min(enemy.shield, ability.hits) * hero.attack * 0.4 : 0;
        return sum + damage + breakValue;
      }, 0) - ability.cost * (hero.focus < hero.maxFocus * 0.4 ? 1.1 : 0.15);
      if (value > bestValue) { best = ability.id; bestValue = value; bestTarget = candidate.uid; }
    }
  }
  return { type: 'ability', id: ABILITY_MAP[best].id, target: bestTarget, boosted: battle.boost >= 3 };
}

function prepare(state: GameState): void {
  care(state, 'rest');
  if (state.needs.nourishment < 72) {
    if (!state.inventory.ration) care(state, 'forage');
    care(state, 'meal');
  }
  if (state.needs.connection < 78) care(state, 'talk');
  if (state.needs.resolve < 75) care(state, 'wash');
  for (const slot of ['armor', 'weapon', 'relic'] as const) {
    const options = ITEMS.filter(item => item.kind === slot && item.level <= levelOf(state));
    const best = options.sort((a, b) => b.level - a.level || (b.stats?.attack ?? 0) - (a.stats?.attack ?? 0))[0];
    if (!best) continue;
    if (!state.inventory[best.id] && state.credits > best.price + 150) buy(state, best.id);
    if (state.inventory[best.id]) equip(state, best.id);
  }
  for (const [id, minimum] of [['medkit', 7], ['focus-tonic', 5]] as const) {
    const count = Math.max(0, minimum - (state.inventory[id] ?? 0));
    if (count && state.credits >= ITEMS.find(item => item.id === id)!.price * count) buy(state, id, count);
  }
  care(state, 'rest');
}

export function simulate(origin: Origin, difficulty: Difficulty = 'standard', seed = 4217, ending = 'common-dawn', checkpoint?: (state: GameState) => void): {
  state: GameState; rounds: number; encounters: number; losses: number; milestones: string[];
} {
  let state = createGame('Test wolf', origin, 1_790_000_000_000, seed);
  state.settings.difficulty = difficulty;
  let rounds = 0;
  let encounters = 0;
  let losses = 0;
  const milestones: string[] = [];
  for (const mission of campaign(origin)) {
    prepare(state);
    startMission(state, mission.id);
    while (state.expedition) {
      checkpoint?.(state);
      const node = activeNode(state)!;
      if (node.kind === 'battle') {
        createBattle(state);
        encounters++;
        let attempts = 0;
        while (state.battle) {
          if (state.battle.outcome === 'active') {
            if (state.battle.round > 180) throw new Error(`${origin}: combat stalled at ${mission.id}, node ${state.expedition!.node}`);
            act(state, chooseAction(state));
            rounds++;
            // Every in-progress combat result must survive export/import.
            state = decodeSave(encodeSave(state));
          } else if (state.battle.outcome === 'won') claimBattle(state);
          else {
            losses++;
            attempts++;
            if (attempts >= 3) throw new Error(`${origin}: three defeats at ${mission.id} (level ${levelOf(state)}, ${JSON.stringify(statsOf(state))})`);
            recoverBattle(state);
            prepare(state);
            createBattle(state);
          }
        }
        advanceNode(state);
      } else {
        const choice = node.kind === 'explore' ? 'overlook'
          : node.choices?.some(value => ENDINGS[value.id]) ? ending : node.choices?.[0].id;
        advanceNode(state, choice);
      }
      state = decodeSave(encodeSave(state));
    }
    if (mission.index === 3) milestones.push(`Ch ${mission.chapter + 1}: L${levelOf(state)}`);
  }
  return { state, rounds, encounters, losses, milestones };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const origin of ['red', 'gold', 'obsidian'] as const) {
    const result = simulate(origin);
    console.log(JSON.stringify({
      origin, ending: result.state.ending, level: levelOf(result.state), carved: result.state.carved,
      rounds: result.rounds, encounters: result.encounters, defeats: result.losses,
      credits: result.state.credits, milestones: result.milestones,
    }, null, 2));
  }
}
