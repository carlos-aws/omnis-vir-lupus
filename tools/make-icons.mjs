import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
  args: ['--no-sandbox'],
});
try {
  const page = await browser.newPage();
  const svg = await readFile('public/wolf.svg', 'utf8');
  await mkdir('public/icons', { recursive: true });
  for (const [name, size, inset] of [['icon-192', 192, 0], ['icon-512', 512, 0], ['icon-maskable-512', 512, 70]]) {
    const data = await page.evaluate(async ({ svg, size, inset }) => {
      const image = new Image();
      image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#171c1a'; ctx.fillRect(0, 0, size, size);
      ctx.drawImage(image, inset, inset, size - inset * 2, size - inset * 2);
      return canvas.toDataURL('image/png').split(',')[1];
    }, { svg, size, inset });
    await writeFile(`public/icons/${name}.png`, Buffer.from(data, 'base64'));
  }
} finally { await browser.close(); }
