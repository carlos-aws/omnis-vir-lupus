import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { action, nav, newGame, saved } from './helpers.ts';

test('the complete pixel prologue advances through all five scenes to the title', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  for (const title of ['BENEATH', 'ABOVE', 'BEYOND', 'TOGETHER', 'BECOMING']) {
    await expect(page.locator('.cinematic-caption h1')).toHaveText(title, { timeout: 8000 });
  }
  await expect(action(page, 'new-game')).toBeVisible({ timeout: 8000 });
  expect(errors).toEqual([]);
  await expect(page.locator('canvas')).toHaveCount(1);
});

test('each origin has eight visibly distinct ages in the same equipment', async ({ page }) => {
  await page.goto('/');
  const phases = await page.evaluate(async () => {
    const rulePath = '/src/game/state.ts';
    const spritePath = '/src/render/sprites.ts';
    const originPath = '/src/data/origins.ts';
    const rules = await import(rulePath);
    const sprites = await import(spritePath);
    const { GROWTH } = await import(originPath);
    return ['red', 'gold', 'obsidian'].map(origin => {
      const state = rules.createGame('Portrait study', origin);
      const images = GROWTH.map((phase: { level: number }) => {
        state.xp = rules.xpForLevel(phase.level);
        return sprites.heroSprite(state).toDataURL();
      });
      return { origin, distinct: new Set(images).size };
    });
  });
  expect(phases).toEqual([
    { origin: 'red', distinct: 8 }, { origin: 'gold', distinct: 8 }, { origin: 'obsidian', distinct: 8 },
  ]);
});

test('tablet and desktop screens fit and keep icon-only navigation accessible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await newGame(page);
  for (const width of [768, 1024, 1920]) {
    await page.setViewportSize({ width, height: 1050 });
    for (const view of ['camp', 'world', 'character', 'inventory', 'market', 'journal']) {
      await nav(page, view);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${view}/${width}`).toBe(true);
    }
    await nav(page, 'camp');
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(audit.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), String(width)).toEqual([]);
  }
});

test('camp remains interactive after leaving and returning through menus', async ({ page }) => {
  const warnings: string[] = [];
  page.on('console', message => {
    if (message.type() === 'warning' && message.text().includes('Cannot pause non-running Scene')) {
      warnings.push(message.text());
    }
  });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await newGame(page);
  for (let visit = 0; visit < 2; visit++) {
    for (const view of ['world', 'character', 'inventory', 'market', 'journal', 'camp']) await nav(page, view);
    const rations = (await saved(page)).inventory.ration;
    await page.keyboard.press('e', { delay: 100 });
    await expect.poll(async () => (await saved(page)).inventory.ration).toBe(rations - 1);
  }
  expect(warnings).toEqual([]);
});

test('title, origin selection, settings and cinematic remain usable at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');
  await action(page, 'skip-intro').click();
  await action(page, 'new-game').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(audit.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
  await page.locator('#character-name').fill('W'.repeat(24));
  await page.locator('#creation-form button[type=submit]').click();
  await action(page, 'tutorial-done').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await action(page, 'settings').click();
  const modal = page.getByRole('dialog', { name: 'Settings and saves' });
  expect(await modal.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
});
