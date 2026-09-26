import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { action, firstBattle, nav, newGame, saved } from './helpers.ts';

test('intro can be skipped, then all origins create independent saved characters', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const origin of ['red', 'gold', 'obsidian'] as const) {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await newGame(page, origin);
    expect((await saved(page)).origin).toBe(origin);
    await page.reload();
    await page.getByRole('button', { name: 'Continue as Aster' }).click();
    await expect(page.getByRole('heading', { name: 'The Hollow.' })).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('care, keyboard navigation, equipment, settings, and portable save round trip', async ({ page, browser }) => {
  await newGame(page);
  const before = await saved(page);
  await page.locator('[data-care="meal"]').click();
  await page.locator('[data-care="train"]').click();
  await expect.poll(async () => (await saved(page)).training).toBe(1);
  const after = await saved(page);
  expect(after.inventory.ration).toBe(before.inventory.ration - 1);
  expect(after.xp).toBeGreaterThan(before.xp);
  await page.keyboard.press('i');
  await expect(page.getByRole('heading', { name: 'A pack full of possibilities.' })).toBeVisible();
  await nav(page, 'market');
  await expect(page.getByRole('heading', { name: 'Tools for another tomorrow.' })).toBeVisible();
  await action(page, 'settings').click();
  await page.locator('[data-setting="reducedMotion"]').check();
  await page.locator('[data-setting="textSize"]').check();
  await page.locator('[data-setting="difficulty"]').selectOption('story');
  await expect.poll(async () => (await saved(page)).settings.difficulty).toBe('story');
  const download = page.waitForEvent('download');
  await action(page, 'export').click();
  const exportPath = (await download).path();
  const data = await readFile((await exportPath)!, 'utf8');
  expect(JSON.parse(data).state.name).toBe('Aster');
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const other = await context.newPage();
  await other.goto('http://localhost:5173');
  const chooser = other.waitForEvent('filechooser');
  await action(other, 'import').click();
  await (await chooser).setFiles({ name: 'saved-wolf.json', mimeType: 'application/json', buffer: Buffer.from(data) });
  await action(other, 'confirm').click();
  await expect(other.getByRole('heading', { name: 'The Hollow.' })).toBeVisible();
  const restored = await saved(other);
  expect(restored.id).toBe(after.id);
  expect(restored.xp).toBe(after.xp);
  expect(restored.settings.textSize).toBe('large');
  await context.close();
});

test('a turn is saved before animation and resumes after an immediate reload', async ({ page }) => {
  await newGame(page);
  await firstBattle(page);
  await page.locator('[data-ability="strike"]').click();
  await expect.poll(async () => (await saved(page)).battle?.round).toBe(2);
  const committed = (await saved(page)).battle;
  await page.reload();
  await action(page, 'load-game').click();
  await expect(page.locator('.round-badge')).toContainText('2');
  expect((await saved(page)).battle).toEqual(committed);
  await expect(page.locator('canvas')).toHaveCount(1);
});

test('phone screens fit the viewport and expose accessible controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await newGame(page);
  for (const view of ['camp', 'world', 'character', 'inventory', 'journal']) {
    await nav(page, view);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), view).toBe(true);
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(audit.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), view).toEqual([]);
  }
});
