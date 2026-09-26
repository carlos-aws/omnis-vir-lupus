import type { Application } from '../main.ts';
import { button, dialog, toast } from './kit.ts';
import { save, report } from './session.ts';

export function installOffline(app: Application): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  let registration: ServiceWorkerRegistration | null = null;
  let requestedReload = false;
  const offerUpdate = () => {
    if (!registration?.waiting || document.querySelector('[data-update-ready]')) return;
    const modal = dialog(`<div data-update-ready><span class="eyebrow">A NEW CHAPTER IN THE GAME ITSELF</span><h2>An update is ready.</h2><p>Save your checkpoint and reload to play the latest version. You can also close this window and keep playing.</p><div class="dialog-actions">${button('Save & update', 'update-now', { className: 'primary', icon: 'download' })}</div></div>`, { label: 'Game update available' });
    modal.addEventListener('click', event => {
      if (!(event.target as HTMLElement).closest('[data-action="update-now"]') || app.busy || app.ui.acting) return;
      app.busy = true;
      void (async () => {
        if (app.state) {
          await save(app, app.state);
          if (!app.store.durable) throw new Error('Export your progress before reloading: this device could not save it.');
        }
        requestedReload = true;
        registration?.waiting?.postMessage('ACTIVATE_UPDATE');
      })().catch(report).finally(() => { app.busy = false; });
    });
  };
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (requestedReload) location.reload();
  });
  const base = new URL(import.meta.env.BASE_URL, document.baseURI);
  void navigator.serviceWorker.register(new URL('sw.js', base), { scope: base.pathname })
    .then(async value => {
      registration = value;
      offerUpdate();
      registration.addEventListener('updatefound', () => {
        const worker = registration?.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) offerUpdate();
        });
      });
      await navigator.serviceWorker.ready;
      document.body.dataset.offlineReady = 'true';
      if (!sessionStorage.getItem('ovl.offline-ready')) {
        toast('Ready for offline play. This device has the complete game.', 'success');
        sessionStorage.setItem('ovl.offline-ready', 'true');
      }
    }).catch(() => {
      toast('Offline download was unavailable. Keep a connection for now; your character save still works.');
    });
}
