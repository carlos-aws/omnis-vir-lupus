import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { simulate } from './simulate-campaign.ts';
import { createBattle } from '../src/game/combat.ts';
import { encodeSave, SAVE_KEY } from '../src/game/storage.ts';
import type { GameState } from '../src/game/types.ts';

await mkdir('docs/screenshots', { recursive: true });
await mkdir('tools/out', { recursive: true });
let finalBattle: GameState | undefined;
simulate('red', 'standard', 4217, 'common-dawn', state => {
  if (state.expedition?.missionId === 'c16-m4' && state.expedition.node === 10) finalBattle = structuredClone(state);
});
if (!finalBattle) throw new Error('The final battle checkpoint was not reached.');
finalBattle.name = 'Aster';
createBattle(finalBattle);

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
  args: ['--no-sandbox'],
});
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1080 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://localhost:5173');
  await page.locator('canvas').waitFor();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'docs/screenshots/title-desktop.png', fullPage: true });
  await page.locator('[data-action="new-game"]').click();
  await page.screenshot({ path: 'docs/screenshots/origins-desktop.png', fullPage: true });
  await page.locator('#character-name').fill('Aster');
  await page.locator('#creation-form button[type=submit]').click();
  await page.locator('[data-action="tutorial-done"]').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'docs/screenshots/camp-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'docs/screenshots/camp-mobile.png', fullPage: true });
  await page.locator('.mobile-nav [data-view="world"]').click();
  await page.screenshot({ path: 'tools/out/world-mobile.png', fullPage: true });
  await context.close();

  const battleContext = await browser.newContext({ viewport: { width: 1440, height: 1080 } });
  await battleContext.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), {
    key: SAVE_KEY, raw: encodeSave(finalBattle),
  });
  const combat = await battleContext.newPage();
  combat.on('pageerror', error => errors.push(error.message));
  await combat.goto('http://localhost:5173');
  await combat.locator('[data-action="load-game"]').click();
  await combat.waitForTimeout(400);
  await combat.screenshot({ path: 'docs/screenshots/battle-desktop.png', fullPage: true });
  await combat.locator('[data-action="battle-tab"][data-tab="skills"]').click();
  const ability = combat.locator('[data-ability="sunlance"]');
  if (await ability.isEnabled()) {
    await ability.click();
    await combat.waitForTimeout(640);
    await combat.evaluate(() => window.scrollTo(0, 0));
    await combat.screenshot({ path: 'tools/out/solar-impact.png', fullPage: true });
    await combat.waitForFunction(() => !document.querySelector('.command-heading')?.textContent?.includes('RESOLVING'));
  }
  await combat.setViewportSize({ width: 390, height: 844 });
  await combat.evaluate(() => window.scrollTo(0, 0));
  await combat.screenshot({ path: 'docs/screenshots/battle-mobile.png', fullPage: true });
  await battleContext.close();
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('Captured title, origins, camp, and battle on desktop and phone without runtime errors.');
} finally { await browser.close(); }
