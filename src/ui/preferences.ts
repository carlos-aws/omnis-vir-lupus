import type { Application } from '../main.ts';
import type { Settings } from '../game/types.ts';
import { change, report } from './session.ts';

export function installPreferences(app: Application): void {
  let pending = Promise.resolve();
  document.addEventListener('change', event => {
    const control = event.target;
    if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement) || !control.dataset.setting) return;
    const key = control.dataset.setting as keyof Settings;
    const value = control.value;
    const checked = control instanceof HTMLInputElement && control.checked;
    pending = pending.then(() => change(app, state => {
      const settings = state.settings;
      if (key === 'sound' || key === 'music' || key === 'reducedMotion') settings[key] = checked;
      else if (key === 'volume') settings.volume = Math.min(1, Math.max(0, Number(value)));
      else if (key === 'textSize') settings.textSize = checked ? 'large' : 'normal';
      else if (key === 'battleSpeed') settings.battleSpeed = value === '2' ? 2 : 1;
      else if (key === 'difficulty' && ['story', 'standard', 'veteran'].includes(value)) settings.difficulty = value as Settings['difficulty'];
    })).then(() => { app.render(); void app.sound.unlock(); }).catch(report);
  });
  document.addEventListener('keydown', event => {
    const target = event.target;
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || app.ui.acting
      || target instanceof HTMLInputElement || target instanceof HTMLSelectElement
      || target instanceof HTMLTextAreaElement || document.querySelector('dialog[open]')) return;
    const key = event.key.toLowerCase();
    const views: Record<string, string> = { h: 'camp', m: 'world', c: 'character', i: 'inventory', q: 'market', j: 'journal' };
    let selector = '';
    if (app.screen === 'cinematic' && key === 'escape') selector = '[data-action="skip-intro"]';
    else if (app.screen !== 'game') return;
    else if (app.state?.battle) {
      const actions: Record<string, string> = {
        '1': '[data-action="battle-ability"][data-ability="strike"]',
        '2': '[data-action="battle-tab"][data-tab="skills"]',
        '3': '[data-action="battle-guard"]', '4': '[data-action="battle-tab"][data-tab="supplies"]',
        '5': '[data-action="battle-companion"]', b: '[data-action="burst"]',
      };
      selector = actions[key] ?? '';
    } else if (views[key]) selector = `.sidebar [data-action="nav"][data-view="${views[key]}"]`;
    if (selector) {
      const control = document.querySelector<HTMLButtonElement>(selector);
      if (control && !control.disabled) { event.preventDefault(); control.click(); }
    }
  });
}
