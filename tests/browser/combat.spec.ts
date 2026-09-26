import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { chooseAction } from '../../tools/simulate-campaign.ts';
import { activeNode } from '../../src/game/state.ts';
import type { GameState } from '../../src/game/types.ts';
import { action, firstBattle, newGame, saved } from './helpers.ts';
const progress = (state: GameState) => JSON.stringify([
  state.expedition?.missionId, state.expedition?.node, state.battle?.round,
  state.battle?.outcome, state.completed.length,
]);

test('complete a main operation through the real story and combat controls', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await newGame(page);
  await action(page, 'continue-story').click();
  await expect(page.locator('.expedition-heading')).toBeVisible();
  for (let step = 0; step < 150; step++) {
    const state = await saved(page);
    if (!state.expedition) break;
    if (state.battle?.outcome === 'active') {
      const move = chooseAction(state);
      if ('target' in move) await page.locator(`[data-action="target"][data-target="${move.target}"]`).click();
      if (move.type === 'ability') {
        if (move.boosted) await action(page, 'burst').click();
        if (move.id !== 'strike') await page.locator('[data-action="battle-tab"][data-tab="skills"]').click();
        await page.locator(`[data-action="battle-ability"][data-ability="${move.id}"]`).click();
      } else if (move.type === 'item') {
        await page.locator('[data-action="battle-tab"][data-tab="supplies"]').click();
        await page.locator(`[data-action="battle-item"][data-item="${move.id}"]`).click();
      } else await action(page, move.type === 'companion' ? 'battle-companion' : 'battle-guard').click();
      await expect(page.locator('.command-heading')).not.toContainText('RESOLVING THE TURN');
    } else if (state.battle?.outcome === 'won') await action(page, 'battle-claim').click();
    else if (state.battle) throw new Error(`Unexpected defeat at node ${state.expedition.node}`);
    else {
      const node = activeNode(state)!;
      if (node.kind === 'battle') await action(page, 'battle-start').click();
      else if (node.choices) {
        await action(page, 'story-choice').first().click();
        await action(page, 'story-close').click();
      } else await action(page, 'story-next').click();
    }
    await expect.poll(async () => progress(await saved(page))).not.toBe(progress(state));
  }
  const final = await saved(page);
  expect(final.completed).toContain('c01-m1');
  expect(final.victories).toBe(4);
  expect(final.expedition).toBeNull();
  expect(Object.keys(final.bestiary).length).toBeGreaterThan(1);
  await expect(page.getByRole('dialog', { name: 'Operation complete' })).toBeVisible();
});

test('mobile combat is accessible and retreat preserves the checkpoint', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await newGame(page, 'obsidian');
  await firstBattle(page);
  await action(page, 'battle-guard').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-action="battle-ability"][data-ability="strike"]')).toBeFocused();
  await expect(page.locator('.battle-landscape')).toBeInViewport({ ratio: 0.95 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(audit.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
  const checkpoint = (await saved(page)).expedition!.node;
  await action(page, 'battle-flee').click();
  await action(page, 'confirm').click();
  await action(page, 'battle-recover').click();
  await expect(page.getByRole('heading', { name: 'The Hollow.' })).toBeVisible();
  expect((await saved(page)).expedition!.node).toBe(checkpoint);
  await action(page, 'expedition').click();
  await expect(action(page, 'battle-start')).toBeVisible();
});
