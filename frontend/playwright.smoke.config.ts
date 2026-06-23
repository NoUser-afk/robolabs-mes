import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.SMOKE_BASE_URL || 'http://localhost:8088';

export default defineConfig({
  testDir: './smoke',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL,
    channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
});
