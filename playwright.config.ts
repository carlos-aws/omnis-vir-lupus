import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

export default defineConfig({
  testDir: './tests/browser',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    viewport: { width: 1440, height: 1000 },
    trace: { mode: 'retain-on-failure', screenshots: false, snapshots: true, sources: true },
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium', launchOptions: {
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
          ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
        args: ['--no-sandbox'],
      } },
    },
    ...(process.env.CI || process.env.OVL_ALL_BROWSERS ? [
      { name: 'firefox', use: { browserName: 'firefox' as const } },
      { name: 'webkit', use: { browserName: 'webkit' as const } },
    ] : []),
  ],
  webServer: [{
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  }, {
    command: 'node tools/serve-dist.mjs',
    url: 'http://localhost:5174/omnis-vir-lupus/',
    reuseExistingServer: !process.env.CI,
  }],
});
