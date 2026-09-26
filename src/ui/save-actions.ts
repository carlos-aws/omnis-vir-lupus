import type { Application } from '../main.ts';
import { decodeSave, encodeSave, MAX_SAVE_BYTES } from '../game/storage.ts';
import { chapterOf, levelOf } from '../game/state.ts';
import { ORIGINS } from '../data/origins.ts';
import { confirm, toast } from './kit.ts';
import { report, save } from './session.ts';

function exportFile(app: Application): void {
  if (!app.state) throw new Error('There is no active story to export.');
  const blob = new Blob([encodeSave(app.state)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const name = app.state.name.replace(/[^a-z0-9-]/gi, '-').slice(0, 24) || 'wolf';
  link.download = `omnis-vir-lupus-${name}-L${levelOf(app.state)}-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  toast('Save file exported. Keep it somewhere safe.', 'success');
}

async function importFile(app: Application, file: File): Promise<void> {
  if (file.size > MAX_SAVE_BYTES) throw new Error('That file is too large to be a game save.');
  const raw = await file.text();
  const candidate = decodeSave(raw);
  const description = `${candidate.name} · ${ORIGINS[candidate.origin].name} · Level ${levelOf(candidate)}. This replaces the current story on this device. Your current checkpoint will be kept as the previous save.`;
  if (!await confirm('Import this story?', description, 'Import save')) return;
  if (app.busy || app.ui.acting) throw new Error('Wait until the current action finishes before importing.');
  app.busy = true;
  try {
    await save(app, candidate, true);
    if (!app.store.durable) throw new Error('The import could not be stored. Your current story is still open.');
    app.state = candidate;
    app.screen = 'game'; app.expedition = Boolean(candidate.expedition);
    app.ui.view = 'camp'; app.ui.selectedChapter = chapterOf(candidate);
    app.ui.battleTab = 'actions'; app.ui.boosted = false;
    document.querySelectorAll<HTMLDialogElement>('dialog').forEach(modal => modal.close());
    app.render(true);
    toast('Your story has arrived safely.', 'success');
  } finally { app.busy = false; }
}

export async function saveAction(app: Application, action: string): Promise<boolean> {
  if (action === 'export') exportFile(app);
  else if (action === 'import') {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json,application/json'; input.hidden = true;
    document.body.append(input);
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      input.remove();
      if (file) void importFile(app, file).catch(report);
    }, { once: true });
    input.addEventListener('cancel', () => input.remove(), { once: true });
    input.click();
  } else if (action === 'restore') {
    const candidate = app.store.previous();
    if (!await confirm('Restore the previous checkpoint?', `${candidate.name} · Level ${levelOf(candidate)}. The current checkpoint will become the previous save. Export first if you want to keep a separate copy.`, 'Restore checkpoint')) return true;
    await save(app, candidate, true);
    if (!app.store.durable) throw new Error('The checkpoint could not be restored on this device.');
    app.state = candidate; app.expedition = Boolean(candidate.expedition);
    app.ui.selectedChapter = chapterOf(candidate);
    document.querySelectorAll<HTMLDialogElement>('dialog').forEach(modal => modal.close());
    app.render(true);
    toast('Previous checkpoint restored.', 'success');
  } else return false;
  return true;
}
