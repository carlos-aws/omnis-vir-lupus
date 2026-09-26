import type { Application } from '../main.ts';
import type { GameState } from '../game/types.ts';
import { SaveConflict, SAVE_KEY } from '../game/storage.ts';
import { tickCare } from '../game/state.ts';
import { button, dialog, toast } from './kit.ts';

/** All game mutations use a draft; conflicts never overwrite a newer tab. */
export async function change<T>(app: Application, edit: (draft: GameState) => T): Promise<T> {
  if (!app.state) throw new Error('Begin or load a story first.');
  if (app.busy) throw new Error('The previous action is still being saved.');
  app.busy = true;
  try {
    const draft = structuredClone(app.state);
    tickCare(draft);
    const result = edit(draft);
    draft.updatedAt = Date.now();
    await save(app, draft);
    app.state = draft;
    return result;
  } finally { app.busy = false; }
}

export async function save(app: Application, state: GameState, replace = false): Promise<void> {
  const write = () => app.store.write(state, replace);
  try {
    const durable = navigator.locks
      ? await navigator.locks.request(SAVE_KEY, write)
      : write();
    app.ui.saveStatus = durable ? 'Saved on this device' : 'Export a backup';
    if (!durable && !document.querySelector('.toast.error')) toast(app.store.warning!, 'error');
  } catch (error) {
    if (error instanceof SaveConflict) {
      app.ui.saveStatus = 'Newer save in another tab';
      if (!document.querySelector('[data-conflict]')) {
        dialog(`<div data-conflict><h2>A newer checkpoint exists.</h2><p>Another tab changed this story. Load its latest checkpoint to continue, or export this tab’s progress first.</p><div class="dialog-actions">${button('Export this tab', 'export')}${button('Load latest', 'reload-save', { className: 'primary' })}</div></div>`, { label: 'Save changed in another tab' });
      }
    }
    throw error;
  }
}

export function report(error: unknown): void {
  toast(error instanceof Error ? error.message : 'That action could not be completed.', 'error');
}
