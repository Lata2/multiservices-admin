import { defineConfig, devices } from '@playwright/test';

/**
 * E2E suite: builds the app, serves the production bundle with `vite preview`
 * and runs user flows plus a crawl of every route at five screen sizes.
 * Set CHROME_PATH to use an existing Chromium binary.
 */
const executablePath = process.env.CHROME_PATH || undefined;
const launch = executablePath ? { launchOptions: { executablePath } } : {};

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4174', trace: 'retain-on-failure', ...launch },
  webServer: {
    command: 'npm run build && npx vite preview --port 4174 --strictPort',
    url: 'http://localhost:4174',
    reuseExistingServer: true,
    timeout: 180_000,
    env: { VITE_MOCK_LATENCY: '60' },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'laptop', use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 768 } } },
    { name: 'tablet', use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 }, hasTouch: true } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
    { name: 'small-phone', use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true } },
  ],
});
