import type { Application } from '../main.ts';
import { SAVE_KEY } from '../game/storage.ts';
import { change } from './session.ts';

export function installLifecycle(app: Application): void {
  let lastPulse = performance.now();
  let pendingSeconds = 0;
  let profileId = app.state?.id;
  const pulse = () => {
    const now = performance.now();
    if (profileId !== app.state?.id) {
      profileId = app.state?.id;
      pendingSeconds = 0;
      lastPulse = now;
    }
    if (app.screen === 'game' && !document.hidden) pendingSeconds += Math.min(60, (now - lastPulse) / 1000);
    lastPulse = now;
  };
  const flush = async () => {
    if (!app.state || app.busy || app.ui.acting || pendingSeconds < 1) return;
    const seconds = Math.floor(pendingSeconds);
    try {
      await change(app, state => { state.playSeconds += seconds; });
      pendingSeconds -= seconds;
    } catch { /* The save path already explains conflicts; retain uncommitted time. */ }
  };
  setInterval(() => { pulse(); if (pendingSeconds >= 30) void flush(); }, 1000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { app.renderer.pause(); app.sound.pause(); void flush(); }
    else { lastPulse = performance.now(); app.render(); app.sound.resume(); }
  });
  window.addEventListener('pagehide', () => { pulse(); app.renderer.pause(); app.sound.pause(); void flush(); });
  window.addEventListener('pageshow', event => { if (event.persisted) { lastPulse = performance.now(); app.render(); } });
  window.addEventListener('storage', event => {
    if (event.key !== SAVE_KEY || !app.state) return;
    app.ui.saveStatus = 'Changed in another tab';
    const status = document.getElementById('save-status');
    if (status) { status.textContent = app.ui.saveStatus; status.classList.remove('saved'); }
  });
}
