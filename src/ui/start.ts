import type { Application } from '../main.ts';
import type { Origin } from '../game/types.ts';
import { createGame } from '../game/state.ts';
import { confirm, dialog } from './kit.ts';
import { tutorialContent } from './welcome.ts';
import { report, save } from './session.ts';

export async function startAction(app: Application, action: string, control: HTMLElement): Promise<boolean> {
  if (action === 'new-game') {
    if ((app.state || app.store.warning) && !await confirm('Begin a new life?', 'Your current story will be replaced after you create a character. Export it first if you want to keep it.', 'Choose an origin')) return true;
    app.screen = 'creation'; app.render(true);
  } else if (action === 'origin') {
    const name = document.querySelector<HTMLInputElement>('#character-name')?.value ?? '';
    app.origin = control.dataset.origin as Origin;
    app.render();
    const input = document.querySelector<HTMLInputElement>('#character-name')!;
    input.value = name;
    document.querySelector<HTMLButtonElement>(`.origin-card.${app.origin}`)?.focus();
  } else if (action === 'reload-save') {
    app.state = app.store.load();
    app.ui.saveStatus = app.store.durable ? 'Saved on this device' : app.store.warning ? 'Export a backup' : 'No checkpoint yet';
    document.querySelectorAll<HTMLDialogElement>('dialog').forEach(modal => modal.close());
    app.screen = app.state ? 'game' : 'title'; app.render(true);
  } else return false;
  return true;
}

export function installCreation(app: Application): void {
  document.addEventListener('submit', event => {
    if (!(event.target instanceof HTMLFormElement) || event.target.id !== 'creation-form') return;
    event.preventDefault();
    if (app.busy) return;
    const name = String(new FormData(event.target).get('name') ?? '').trim();
    if (!name) { document.getElementById('character-name')?.focus(); return; }
    app.busy = true;
    void (async () => {
      const state = createGame(name, app.origin);
      state.settings.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
      await save(app, state, true);
      app.state = state; app.ui.view = 'camp'; app.ui.selectedChapter = 0;
      app.screen = 'game'; app.expedition = false; app.render(true);
      dialog(tutorialContent(state), { label: 'Welcome to the Hollow' });
    })().catch(report).finally(() => { app.busy = false; });
  });
}
