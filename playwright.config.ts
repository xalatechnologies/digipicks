import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 *
 * Runs against the web app (localhost:5190 in dev, localhost:4173 in CI preview).
 *
 * CI mode: Builds the web app, then runs `vite preview` to serve the static build.
 * Local mode: Starts the vite dev server via `pnpm dev:web`.
 * SKIP_WEB_SERVER=1: Assumes a server is already running at TEST_BASE_URL.
 */

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: 1,
  reporter: isCI
    ? [
        ['list'],
        ['html', { outputFolder: 'playwright-report', open: 'never' }],
        ['junit', { outputFile: 'playwright-results.xml' }],
      ]
    : [['list'], ['html', { outputFolder: 'playwright-report' }]],
  timeout: 60000,

  use: {
    baseURL: process.env.TEST_BASE_URL ?? (isCI ? 'http://localhost:4173' : 'http://localhost:5190'),
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    ...(isCI
      ? []
      : [
          {
            name: 'Mobile Safari',
            use: { ...devices['iPhone 13'] },
          },
        ]),
    {
      name: 'a-krav',
      testDir: './tests/e2e/a-krav',
      use: {
        ...devices['Desktop Chrome'],
        video: 'on',
        screenshot: 'on',
        trace: 'on',
      },
    },
  ],

  /* Run local dev server before starting the tests */
  webServer: process.env.SKIP_WEB_SERVER
    ? undefined
    : isCI
      ? {
          command: 'pnpm --filter @digipicks/web preview --port 4173',
          url: 'http://localhost:4173',
          reuseExistingServer: false,
          timeout: 30000,
        }
      : {
          command: 'pnpm dev:web',
          url: 'http://localhost:5190',
          reuseExistingServer: true,
          timeout: 120000,
        },
});
