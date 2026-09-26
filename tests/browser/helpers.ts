import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { GameState, Origin } from '../../src/game/types.ts';
import { SAVE_KEY } from '../../src/game/storage.ts';

export const action = (page: Page, name: string) => page.locator(`[data-action="${name}"]`);
export async function saved(page: Page): Promise<GameState> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)!).state, SAVE_KEY);
}
export async function newGame(page: Page, origin: Origin = 'red', name = 'Aster', url = '/'): Promise<void> {
  await page.goto(url);
  if (await action(page, 'skip-intro').isVisible()) await action(page, 'skip-intro').click();
  await page.getByRole('button', { name: 'Begin your story', exact: true }).click();
  await page.locator(`[data-origin="${origin}"]`).click();
  await page.locator('#character-name').fill(name);
  await page.locator('#creation-form button[type=submit]').click();
  await action(page, 'tutorial-done').click();
  await expect(page.getByRole('heading', { name: 'The Hollow.' })).toBeVisible();
}
export async function nav(page: Page, view: string): Promise<void> {
  const links = page.locator(`[data-action="nav"][data-view="${view}"]`);
  for (const link of await links.all()) {
    if (await link.isVisible()) { await link.click(); return; }
  }
  throw new Error(`No visible navigation to ${view}`);
}
export async function firstBattle(page: Page): Promise<void> {
  await action(page, 'continue-story').click();
  await action(page, 'story-next').click();
  await action(page, 'story-choice').first().click();
  await action(page, 'story-close').click();
  await action(page, 'battle-start').click();
  await expect(page.locator('.round-badge')).toContainText('1');
}
