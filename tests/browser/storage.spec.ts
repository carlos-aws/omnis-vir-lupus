import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { action, newGame, saved } from './helpers.ts';

test('a stale tab cannot overwrite newer progress', async ({ page, context }) => {
  await newGame(page);
  const other = await context.newPage();
  await other.goto('/');
  await action(other, 'load-game').click();
  await page.locator('[data-care="train"]').click();
  await expect.poll(async () => (await saved(page)).training).toBe(1);
  await other.locator('[data-care="train"]').click();
  await expect(other.getByRole('dialog', { name: 'Save changed in another tab' })).toBeVisible();
  expect((await saved(page)).training).toBe(1);
  await action(other, 'reload-save').click();
  await other.locator('[data-care="train"]').click();
  await expect.poll(async () => (await saved(other)).training).toBe(2);
  expect((await saved(page)).training).toBe(2);
});

test('storage failure stays playable and exports the actual in-memory progress', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key.startsWith('omnis-vir-lupus.')) throw new DOMException('Storage full', 'QuotaExceededError');
      original.call(this, key, value);
    };
  });
  await newGame(page);
  await page.locator('[data-care="train"]').click();
  await expect(page.locator('#save-status')).toContainText('Export a backup');
  await action(page, 'settings').click();
  await expect(page.getByRole('dialog')).toContainText('could not be saved');
  const download = page.waitForEvent('download');
  await action(page, 'export').click();
  const path = await (await download).path();
  const exported = JSON.parse(await readFile(path!, 'utf8'));
  expect(exported.state.name).toBe('Aster');
  expect(exported.state.training).toBe(1);
  expect(exported.state.xp).toBeGreaterThan(0);
  expect(await page.evaluate(() => localStorage.getItem('omnis-vir-lupus.save.v1'))).toBeNull();
});

test('repeated navigation retains one canvas and keyboard focus after care', async ({ page }) => {
  await newGame(page);
  for (let n = 0; n < 5; n++) {
    await page.keyboard.press('m');
    await page.keyboard.press('h');
  }
  await expect(page.locator('canvas')).toHaveCount(1);
  const train = page.locator('[data-care="train"]');
  await train.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-care="train"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await saved(page)).training).toBe(2);
});
