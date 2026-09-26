import type { Application } from '../main.ts';
import type { Action } from '../game/types.ts';
import { act, claimBattle, recoverBattle } from '../game/combat.ts';
import { advanceNode, levelOf } from '../game/state.ts';
import { confirm, toast } from './kit.ts';
import { change } from './session.ts';

async function turn(app: Application, action: Action): Promise<void> {
  app.ui.acting = true;
  app.render();
  document.querySelector<HTMLElement>('.command-panel')?.focus({ preventScroll: true });
  try {
    // The entire turn is durable before the first animation begins.
    const events = await change(app, state => act(state, action));
    if (events.some(event => event.kind === 'break')) app.sound.cue('break');
    else app.sound.cue(action.type === 'ability' && action.id !== 'strike' ? 'magic' : 'hit');
    await app.renderer.present(events, app.state!.settings.battleSpeed);
    if (app.state!.battle?.outcome === 'won') app.sound.cue('win');
    app.ui.boosted = false;
    app.ui.battleTab = 'actions';
    const enemies = app.state!.battle?.enemies ?? [];
    if (!enemies.some(enemy => enemy.uid === app.ui.selectedEnemy && enemy.hp > 0)) {
      app.ui.selectedEnemy = enemies.find(enemy => enemy.hp > 0)?.uid ?? '';
    }
  } finally {
    app.ui.acting = false;
    app.render();
    document.querySelector<HTMLElement>(
      '[data-action="battle-claim"], [data-action="battle-recover"], [data-action="battle-ability"][data-ability="strike"]',
    )?.focus({ preventScroll: true });
  }
}

export async function battleAction(app: Application, action: string, control: HTMLElement): Promise<boolean> {
  const battle = app.state?.battle;
  if (!battle) return false;
  const target = battle.enemies.find(enemy => enemy.uid === app.ui.selectedEnemy && enemy.hp > 0)
    ?? battle.enemies.find(enemy => enemy.hp > 0) ?? battle.enemies[0];
  if (action === 'target') app.ui.selectedEnemy = control.dataset.target!;
  else if (action === 'battle-tab') app.ui.battleTab = control.dataset.tab as typeof app.ui.battleTab;
  else if (action === 'burst') app.ui.boosted = !app.ui.boosted && battle.boost >= 3;
  else if (action === 'battle-speed') {
    await change(app, state => { state.settings.battleSpeed = state.settings.battleSpeed === 1 ? 2 : 1; });
  } else if (action === 'battle-ability') {
    await turn(app, { type: 'ability', id: control.dataset.ability!, target: target.uid, boosted: app.ui.boosted }); return true;
  } else if (action === 'battle-guard') {
    await turn(app, { type: 'guard' }); return true;
  } else if (action === 'battle-item') {
    await turn(app, { type: 'item', id: control.dataset.item! }); return true;
  } else if (action === 'battle-companion') {
    await turn(app, { type: 'companion', target: target.uid }); return true;
  } else if (action === 'battle-flee') {
    if (await confirm('Withdraw from the encounter?', 'Your companion will bring you back to camp. You keep your expedition checkpoint and can try the encounter again.', 'Withdraw')) await turn(app, { type: 'flee' });
    return true;
  } else if (action === 'battle-claim') {
    const reward = await change(app, state => {
      const result = claimBattle(state);
      advanceNode(state);
      return result;
    });
    app.expedition = true;
    app.sound.cue(reward.levels ? 'level' : 'win');
    toast(`+${reward.xp} XP · +${reward.credits} credits${reward.levels ? ` · Level ${levelOf(app.state!)}!` : ''}`, 'success');
  } else if (action === 'battle-recover') {
    await change(app, recoverBattle);
    app.expedition = false; app.ui.view = 'camp';
    toast('You are safe. Rest, prepare, and resume when you are ready.', 'success');
  } else return false;
  app.render();
  return true;
}
