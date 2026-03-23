/**
 * Playwright E2E Test Configuration
 *
 * @see https://playwright.dev/docs/test-configuration
 */

import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const E2E_DEV_TENANT = process.env.E2E_DEV_TENANT;
const E2E_DEV_ACTOR = process.env.E2E_DEV_ACTOR;

const extraHTTPHeaders: Record<string, string> = {};
if (E2E_DEV_TENANT && E2E_DEV_ACTOR) {
  extraHTTPHeaders['X-Dev-Tenant'] = E2E_DEV_TENANT;
  extraHTTPHeaders['X-Dev-Actor'] = E2E_DEV_ACTOR;
}

export default defineConfig({
  // Directory with test files
  testDir: './e2e',

  // Pattern to match test files
  testMatch: '**/*.spec.ts',

  // Run tests in parallel within each file
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Use 50% of available cores on CI, or full parallelism locally
  workers: process.env.CI ? '50%' : undefined,

  // Reporter to use
  reporter: [['html', { open: 'never' }], ['list']],

  // Shared settings for all projects
  use: {
    // Base URL for all page.goto() calls
    baseURL: BASE_URL,

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Allow local E2E runs to exercise auth-gated routes without app-level fallbacks.
    extraHTTPHeaders,
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Uncomment these for more comprehensive testing
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    // Mobile viewports
    // {
    //   name: 'mobile-chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'mobile-safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  // Run local dev server before starting the tests
  webServer: {
    command: 'bun run dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes to start
    env: {
      ...process.env,
      NODE_ENV: 'development',
      DATABASE_URL:
        process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dns_ops',
      COLLECTOR_URL: process.env.COLLECTOR_URL || 'http://localhost:3001',
    },
  },
});
