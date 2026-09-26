import type { Application } from '../main.ts';
import { activeNode, advanceNode, chapterOf, growthOf, leaveExpedition, nextMission, startHunt, startMission } from '../game/state.ts';
import { createBattle } from '../game/combat.ts';
import { ITEM_MAP } from '../data/items.ts';
import { button, confirm, dialog, escape, toast } from './kit.ts';
import { endingContent } from './welcome.ts';
import { change } from './session.ts';

export async function storyAction(app: Application, action: string, control: HTMLElement): Promise<boolean> {
  if (!app.state) return false;
  if (action === 'continue-story' || action === 'start-mission') {
    if (!app.state.expedition) await change(app, state => startMission(state, control.dataset.mission ?? nextMission(state)!.id));
    app.expedition = true;
  } else if (action === 'hunt') {
    await change(app, state => startHunt(state, Number(control.dataset.chapter)));
    app.expedition = true;
  } else if (action === 'expedition') app.expedition = true;
  else if (action === 'abandon') {
    if (!await confirm('Leave this expedition?', 'You keep earned items and experience. The operation will restart from its beginning; previously claimed rewards cannot be collected again.', 'Leave expedition')) return true;
    await change(app, leaveExpedition);
    app.expedition = false; app.ui.view = 'camp';
  } else if (action === 'battle-start') {
    await change(app, createBattle);
    app.ui.battleTab = 'actions'; app.ui.boosted = false;
    app.ui.selectedEnemy = app.state.battle!.enemies[0].uid;
    app.sound.setMode('battle');
  } else if (action === 'story-next' || action === 'story-choice') {
    const oldStage = growthOf(app.state);
    const title = activeNode(app.state)?.title ?? 'A choice remembered';
    const result = await change(app, state => advanceNode(state, control.dataset.choice));
    if (result.completed) {
      app.expedition = false; app.ui.view = 'camp'; app.ui.selectedChapter = chapterOf(app.state);
      app.sound.cue(result.levels ? 'level' : 'win');
      if (app.state.ending) dialog(endingContent(app.state), { label: 'Your ending', wide: true });
      else {
        const reward = result.completed.reward;
        dialog(`<span class="eyebrow">OPERATION COMPLETE</span><h2>${escape(result.completed.title)}</h2><p>You return with more than you left with.</p><div class="ending-stats"><div><strong>+${reward.xp}</strong><span>EXPERIENCE</span></div><div><strong>+${reward.credits}</strong><span>CREDITS</span></div><div><strong>+2</strong><span>MEDKITS & RATIONS</span></div></div>${reward.item ? `<p>${escape(ITEM_MAP[reward.item].name)} added to your inventory.</p>` : ''}${result.levels ? `<p class="accent-text">Level up! Health and focus restored.</p>` : ''}${growthOf(app.state) !== oldStage ? `<p class="accent-text">A new phase of life: ${growthOf(app.state).name}.</p>` : ''}${button('Back to the fire', 'story-close', { className: 'primary full-width' })}`, { label: 'Operation complete' });
      }
    } else if (result.text) {
      dialog(`<span class="eyebrow">A CHOICE REMEMBERED</span><h2>${escape(title)}</h2><p>${escape(result.text)}</p><div class="dialog-actions">${button('Continue', 'story-close', { className: 'primary', icon: 'arrow' })}</div>`, { label: 'The consequence of your choice' });
    }
  } else if (action === 'story-close' || action === 'ending-close') {
    control.closest('dialog')?.close();
  } else return false;
  app.sound.setMode(app.state.battle ? 'battle' : 'camp');
  app.render(true);
  if (action === 'battle-start') toast('Choose a target. Read its intention, then choose your move.');
  return true;
}
