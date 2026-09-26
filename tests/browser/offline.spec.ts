import { test, expect } from '@playwright/test';
import { action, nav, newGame, saved } from './helpers.ts';

const url = 'http://localhost:5174/omnis-vir-lupus/';

test('the built game runs offline under a repository path and preserves other apps’ caches', async ({ page, context }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await context.addInitScript(async () => {
    const other = await caches.open('pixel-pals-unrelated-test');
    await other.put('/unrelated-cache-marker', new Response('keep'));
  });
  await newGame(page, 'gold', 'Sol', url);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await expect(page.locator('body')).toHaveAttribute('data-offline-ready', 'true');
  const cachesBefore = await page.evaluate(() => caches.keys());
  expect(cachesBefore).toContain('pixel-pals-unrelated-test');
  expect(cachesBefore.some(name => name.startsWith('omnis-vir-lupus:/omnis-vir-lupus/:'))).toBe(true);
  await page.locator('[data-care="train"]').click();
  await expect.poll(async () => (await saved(page)).training).toBe(1);
  const id = (await saved(page)).id;
  await context.setOffline(true);
  await page.reload();
  await action(page, 'load-game').click();
  await expect(page.getByRole('heading', { name: 'The Hollow.' })).toBeVisible();
  await nav(page, 'world');
  await expect(page.getByRole('heading', { name: 'No road belongs to an empire.' })).toBeVisible();
  await nav(page, 'camp');
  await page.locator('[data-care="rest"]').click();
  const exported = page.waitForEvent('download');
  await action(page, 'settings').click();
  await action(page, 'export').click();
  expect((await exported).suggestedFilename()).toContain('Sol');
  expect((await saved(page)).id).toBe(id);
  expect(errors).toEqual([]);
});

test('a corrupt import leaves the live story and stored checkpoint intact', async ({ page }) => {
  await newGame(page);
  const before = await saved(page);
  await action(page, 'settings').click();
  const chooser = page.waitForEvent('filechooser');
  await action(page, 'import').click();
  await (await chooser).setFiles({
    name: 'broken.json', mimeType: 'application/json',
    buffer: Buffer.from('{"format":"omnis-vir-lupus","version":1,"state":null}'),
  });
  await expect(page.getByRole('alert')).toContainText(/save|checksum|invalid/i);
  expect((await saved(page)).id).toBe(before.id);
  expect((await saved(page)).xp).toBe(before.xp);
});
