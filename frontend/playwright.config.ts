import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  /* Keep auth/rate-limited flows deterministic across local and CI runs. */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Run E2E sequentially to avoid backend login rate-limit collisions. */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['list'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://127.0.0.1:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects (browsers) */
  projects: process.env.CI
    ? [
        // Keep CI stable and fast. Run cross-browser suites locally or on a separate workflow.
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
      ]
    : [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
        { name: 'webkit', use: { ...devices['Desktop Safari'] } },
        { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
        { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
      ],

  /* Run your local dev server before starting the tests */
  webServer: {
    // Build once and run the standalone production server for E2E.
    // CI always removes .next first so stale vendor chunks cannot be reused.
    command:
      'node -e "require(\'fs\').rmSync(\'.next\', { recursive: true, force: true })" && npm run build && node -e "const fs=require(\'fs\'); fs.cpSync(\'.next/static\', \'.next/standalone/.next/static\', { recursive: true }); if (fs.existsSync(\'public\')) fs.cpSync(\'public\', \'.next/standalone/public\', { recursive: true });" && node .next/standalone/server.js',
    url: 'http://127.0.0.1:3000',
    env: {
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1',
      HOSTNAME: '127.0.0.1',
      PORT: '3000',
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});









