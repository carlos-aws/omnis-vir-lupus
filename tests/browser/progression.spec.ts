import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { GameState } from '../../src/game/types.ts';
import { simulate } from '../../tools/simulate-campaign.ts';
import { encodeSave } from '../../src/game/storage.ts';
import { action, nav, saved } from './helpers.ts';

const checkpoints: Record<string, GameState> = {};
test.beforeAll(() => {
  simulate('red', 'standard', 4217, 'common-dawn', state => {
    const key = `${state.expedition?.missionId}:${state.expedition?.node}`;
    if (['c02-m1:0', 'c03-m4:11', 'c05-m1:0', 'c16-m4:12'].includes(key)) checkpoints[key] = structuredClone(state);
  });
});

async function importCheckpoint(page: Page, state: GameState): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const chooser = page.waitForEvent('filechooser');
  await action(page, 'import').click();
  await (await chooser).setFiles({
    name: 'checkpoint.json', mimeType: 'application/json',
    buffer: Buffer.from(encodeSave({ ...state, settings: { ...state.settings, reducedMotion: true } })),
  });
  await action(page, 'confirm').click();
  await expect(page.locator('.game-shell')).toBeVisible();
}

test('Red’s Carving changes appearance and keeps the original identity', async ({ page }) => {
  const before = checkpoints['c03-m4:11'];
  expect(before.carved).toBe(false);
  await importCheckpoint(page, before);
  await action(page, 'story-next').click();
  await action(page, 'story-close').click();
  await expect(page.locator('.character-identity')).toContainText('CARVED GOLD');
  const result = await saved(page);
  expect(result.carved).toBe(true);
  expect(result.origin).toBe('red');
  expect(result.completed).toContain('c03-m4');
  await nav(page, 'character');
  await expect(page.locator('.origin-memory')).toContainText('The Carving changed your body.');
});

test('buying, equipping, and forging changes the visible character and stats', async ({ page }) => {
  await importCheckpoint(page, checkpoints['c02-m1:0']);
  await nav(page, 'character');
  const portrait = await page.locator('.large-portrait img').getAttribute('src');
  await nav(page, 'market');
  await page.locator('[data-action="buy"][data-item="t1-spear"]').click();
  await nav(page, 'inventory');
  await page.locator('[data-action="equip"][data-item="t1-spear"]').click();
  await page.locator('[data-action="upgrade"][data-item="t1-spear"]').click();
  await action(page, 'confirm').click();
  await expect.poll(async () => (await saved(page)).upgrades['t1-spear']).toBe(1);
  expect((await saved(page)).equipment.weapon).toBe('t1-spear');
  await nav(page, 'character');
  expect(await page.locator('.large-portrait img').getAttribute('src')).not.toBe(portrait);
  await expect(page.locator('.equipped-grid')).toContainText('+1');
});

test('all companions become selectable after convergence', async ({ page }) => {
  await importCheckpoint(page, checkpoints['c05-m1:0']);
  await nav(page, 'camp');
  await action(page, 'companions').click();
  await page.locator('[data-action="companion-select"][data-companion="ione"]').click();
  await expect(page.locator('.companion-mini')).toContainText('Ione');
  expect((await saved(page)).companion).toBe('ione');
});

for (const ending of ['common-dawn', 'wandering-wolf', 'golden-cage']) {
  test(`the final choice opens the ${ending} ending and leaves the world playable`, async ({ page }) => {
    await importCheckpoint(page, checkpoints['c16-m4:12']);
    await page.locator(`[data-action="story-choice"][data-choice="${ending}"]`).click();
    await expect(page.getByRole('dialog', { name: 'Your ending' })).toBeVisible();
    expect((await saved(page)).ending).toBe(ending);
    expect((await saved(page)).completed).toHaveLength(64);
    await action(page, 'ending-close').click();
    await nav(page, 'world');
    await expect(action(page, 'hunt')).toBeEnabled();
  });
}
