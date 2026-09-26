import type { Application } from '../main.ts';
import type { View } from '../game/types.ts';
import { chapterOf } from '../game/state.ts';
import { creditsContent, settingsContent, tutorialContent } from './welcome.ts';
import { dialog, toast } from './kit.ts';
import { change, report } from './session.ts';
import { installCreation, startAction } from './start.ts';
import { campAction } from './camp-actions.ts';
import { storyAction } from './story-actions.ts';
import { battleAction } from './battle-actions.ts';
import { saveAction } from './save-actions.ts';
import { cinematicAction } from './cinematic.ts';

const views: View[] = ['camp', 'world', 'character', 'inventory', 'journal', 'market'];

export function installActions(app: Application): void {
  installCreation(app);
  let pending = Promise.resolve();
  document.addEventListener('click', event => {
    const control = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-action]');
    if (!control || control.disabled || app.ui.acting) return;
    void app.sound.unlock();
    pending = pending.then(async () => {
      // An autosave must not consume the player's click. A replaced control
      // belongs to an earlier screen and must not trigger a second transaction.
      while (app.busy && control.isConnected) {
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      }
      if (!control.isConnected || control.disabled || app.ui.acting) return;
      await dispatch(app, control);
    }).catch(report);
  });
}

async function dispatch(app: Application, control: HTMLButtonElement): Promise<void> {
  const action = control.dataset.action!;
  if (cinematicAction(app, action)) return;
  if (await startAction(app, action, control)) return;
  if (await saveAction(app, action)) return;
  if (await campAction(app, action, control)) return;
  if (await storyAction(app, action, control)) return;
  if (await battleAction(app, action, control)) return;
  if (action === 'load-game' && app.state) app.screen = 'game';
  else if (action === 'title') {
    document.querySelectorAll<HTMLDialogElement>('dialog').forEach(modal => modal.close());
    app.screen = 'title';
  } else if (action === 'nav' && views.includes(control.dataset.view as View)) {
    if (app.state?.battle) { toast('Finish the encounter or withdraw before leaving.'); return; }
    app.ui.view = control.dataset.view as View; app.expedition = false;
    if (app.ui.view === 'world' && app.state) app.ui.selectedChapter = chapterOf(app.state);
  } else if (action === 'settings') {
    dialog(settingsContent(app.state, app.store.durable, app.store.warning), { label: 'Settings and saves' });
    return;
  } else if (action === 'credits') {
    dialog(creditsContent(), { label: 'Credits and inspiration' }); return;
  } else if (action === 'help' && app.state) {
    dialog(tutorialContent(app.state), { label: 'Field guide' }); return;
  } else if (action === 'tutorial-done') {
    await change(app, state => { state.tutorialSeen = true; });
    control.closest('dialog')?.close();
  } else if (action === 'sound') {
    await change(app, state => { state.settings.sound = !state.settings.sound; });
  } else if (action === 'fullscreen') {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    else toast('Use your browser’s Add to Home Screen option for a full-screen experience.');
    return;
  } else if (action === 'item-filter') app.ui.inventoryFilter = control.dataset.filter!;
  else if (action === 'journal-tab') app.ui.journalTab = control.dataset.tab!;
  else if (action === 'chapter') app.ui.selectedChapter = Number(control.dataset.chapter);
  else return;
  app.sound.cue('tap');
  app.render(action === 'nav' || action === 'load-game' || action === 'title');
}
