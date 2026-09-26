import type { Application } from '../main.ts';
import { COMPANIONS, ORIGINS } from '../data/origins.ts';
import { ITEM_MAP } from '../data/items.ts';
import { buy, care, equip, sell, storyCompleted, upgrade, upgradeCost, useSupply } from '../game/state.ts';
import type { CareAction } from '../game/state.ts';
import { companionContent } from './welcome.ts';
import { confirm, dialog, toast } from './kit.ts';
import { change } from './session.ts';

export async function campAction(app: Application, action: string, control: HTMLElement): Promise<boolean> {
  if (!app.state) return false;
  const item = ITEM_MAP[control.dataset.item ?? ''];
  if (action === 'care' || action === 'forage' || action === 'wash') {
    const kind = (control.dataset.care ?? action) as CareAction;
    const result = await change(app, state => care(state, kind));
    app.render(); app.renderer.care(kind); app.sound.cue('care');
    if (kind === 'talk') {
      const companion = COMPANIONS.find(c => c.id === app.state!.companion)!;
      dialog(`<span class="eyebrow">A QUIET MOMENT · ${companion.name.toUpperCase()}</span><h2>The people who stay.</h2><p>${result.text}</p><p class="panel-note">Bond ${app.state.bonds[companion.id]}/100 · Connection restored</p>`, { label: `A conversation with ${companion.name}` });
    } else toast(result.text + (result.xp ? ` +${result.xp} XP` : ''), 'success');
    return true;
  } else if (action === 'companions') {
    dialog(companionContent(app.state), { label: 'Choose a companion', wide: true }); return true;
  } else if (action === 'companion-select') {
    await change(app, state => {
      const companion = COMPANIONS.find(c => c.id === control.dataset.companion);
      if (!companion || state.battle) throw new Error('That companion is unavailable.');
      if (companion.id !== ORIGINS[state.origin].companion && storyCompleted(state) < Math.max(16, companion.unlock)) throw new Error('Keep following the story to meet this companion.');
      state.companion = companion.id;
    });
    control.closest('dialog')?.close();
    toast('A familiar presence at your side.', 'success');
  } else if (item && action === 'equip') {
    await change(app, state => equip(state, item.id));
    toast(`${item.name} equipped.`, 'success');
  } else if (item && action === 'buy') {
    await change(app, state => buy(state, item.id));
    app.sound.cue('buy'); toast(`${item.name} added to your pack.`, 'success');
  } else if (item && action === 'use') {
    await change(app, state => useSupply(state, item.id));
    app.sound.cue('care'); toast(`${item.name} used.`, 'success');
  } else if (item && action === 'sell') {
    if (item.kind !== 'consumable' && item.kind !== 'material'
      && !await confirm(`Sell ${item.name}?`, 'This removes one copy from your pack. Equipped items must be replaced before they can be sold.', `Sell for ${Math.floor(item.price * .4)} credits`)) return true;
    const credits = await change(app, state => sell(state, item.id));
    toast(`Sold for ${credits} credits.`, 'success');
  } else if (item && action === 'upgrade') {
    const cost = upgradeCost(app.state, item);
    if (!await confirm(`Forge ${item.name}?`, `Gain another 15% of this item’s base stats. Costs ${cost.credits} credits and ${cost.alloy} alloy${cost.sunstone ? ` and ${cost.sunstone} sunstone` : ''}.`, 'Forge equipment')) return true;
    await change(app, state => upgrade(state, item.id));
    app.sound.cue('buy'); toast('The forge leaves a better edge.', 'success');
  } else return false;
  app.render();
  return true;
}
