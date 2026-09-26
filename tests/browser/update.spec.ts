import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { createDistServer } from '../../tools/serve-dist.mjs';
import { action, newGame, saved } from './helpers.ts';

test('an update waits for a durable save and preserves the current character', async ({ page }) => {
  const source = await readFile('dist/sw.js', 'utf8');
  const server = createDistServer();
  const serve = server.listeners('request')[0];
  let updated = false;
  server.removeAllListeners('request');
  server.on('request', (request, response) => {
    if (updated && request.url?.split('?')[0] === '/omnis-vir-lupus/sw.js') {
      response.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' });
      response.end(source.replace('const CACHE = PREFIX + ', "const CACHE = PREFIX + 'update-test:' + "));
    } else serve.call(server, request, response);
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/omnis-vir-lupus/`;
  try {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await newGame(page, 'red', 'Aster', url);
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    const before = await saved(page);
    const oldCache = await page.evaluate(async () => {
      await caches.open('unrelated-update-check');
      return (await caches.keys()).find(name => name.startsWith('omnis-vir-lupus:'))!;
    });
    const restoreStorage = await page.evaluateHandle(() => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        if (key.startsWith('omnis-vir-lupus.')) throw new DOMException('Full', 'QuotaExceededError');
        original.call(this, key, value);
      };
      return () => { Storage.prototype.setItem = original; };
    });
    await page.locator('[data-care="train"]').click();
    await expect(page.locator('#save-status')).toContainText('Export a backup');
    expect((await saved(page)).training).toBe(0);
    updated = true;
    await page.evaluate(async () => (await navigator.serviceWorker.ready).update());
    const modal = page.getByRole('dialog', { name: 'Game update available' });
    await expect(modal).toBeVisible();
    await action(page, 'update-now').click();
    await expect(modal.getByRole('alert').filter({ hasText: 'Export your progress before reloading' })).toBeVisible();
    await expect(modal).toBeVisible();
    expect((await saved(page)).training).toBe(0);
    expect(await page.evaluate(async () => Boolean((await navigator.serviceWorker.ready).waiting))).toBe(true);
    await restoreStorage.evaluate(restore => restore());
    await restoreStorage.dispose();
    const reloaded = page.waitForEvent('load');
    await action(page, 'update-now').click();
    await reloaded;
    await action(page, 'load-game').click();
    const after = await saved(page);
    expect(after.id).toBe(before.id);
    expect(after.training).toBe(1);
    expect(after.xp).toBeGreaterThan(before.xp);
    const names = await page.evaluate(() => caches.keys());
    expect(names).not.toContain(oldCache);
    expect(names).toContain('unrelated-update-check');
    expect(names.some(name => name.includes('update-test:'))).toBe(true);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
      server.closeAllConnections();
    });
  }
});
