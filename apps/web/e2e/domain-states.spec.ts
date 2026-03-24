/**
 * E2E Tests for Domain 360 States
 *
 * PR-01.3: E2E tests for Domain 360 states
 * Tests empty DB state, error states, and refresh button behavior.
 */

import { expect, test } from '@playwright/test';

const TEST_DOMAIN = 'new-untested-domain.example.com';

/**
 * Tests for empty DB state
 * The empty state should show a yellow warning (not an error)
 */
test.describe('Empty DB State', () => {
  test('shows yellow warning for domain without snapshot', async ({ page }) => {
    // Use a domain that's unlikely to have data in the test DB
    await page.goto(`/domain/${TEST_DOMAIN}`);
    await page.waitForLoadState('networkidle');

    // Should show yellow "no snapshot" warning, not an error
    const noSnapshotWarning = page.getByText(
      /no dns snapshot is available for/i
    );
    await expect(noSnapshotWarning).toBeVisible();

    // The warning should be yellow-ish (has yellow background)
    // We check this by verifying it doesn't have error styling
    const warningContainer = noSnapshotWarning.locator('..');
    await expect(warningContainer).toHaveClass(/yellow/);
  });

  test('shows notes and tags panels even without snapshot', async ({ page }) => {
    await page.goto(`/domain/${TEST_DOMAIN}`);
    await page.waitForLoadState('networkidle');

    // Notes panel should be visible
    await expect(page.getByRole('heading', { name: /notes/i })).toBeVisible();
    // Tags panel should be visible
    await expect(page.getByRole('heading', { name: /tags/i })).toBeVisible();
  });
});

/**
 * Tests for refresh button accessibility and aria-busy state
 */
test.describe('Refresh Button Behavior', () => {
  test('refresh button is visible and enabled initially', async ({ page }) => {
    await page.goto(`/domain/${TEST_DOMAIN}`);
    await page.waitForLoadState('networkidle');

    const refreshButton = page.getByRole('button', { name: /refresh/i });
    await expect(refreshButton).toBeVisible();
    await expect(refreshButton).toBeEnabled();
  });

  test('refresh button shows aria-busy during refresh', async ({ page, request }) => {
    await page.goto(`/domain/${TEST_DOMAIN}`);
    await page.waitForLoadState('networkidle');

    const refreshButton = page.getByRole('button', { name: /refresh/i });

    // Intercept the collect endpoint to delay response
    await page.route('/api/collect/domain', async (route) => {
      // Wait 2 seconds before responding
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.continue();
    });

    // Click refresh and immediately check aria-busy
    const refreshPromise = page.waitForResponse(
      (response) => response.url().includes('/api/collect/domain'),
      { timeout: 5000 }
    );

    await refreshButton.click();

    // Check aria-busy is true during refresh
    await expect(refreshButton).toHaveAttribute('aria-busy', 'true');

    // Button text should indicate refreshing
    await expect(refreshButton).toHaveText(/refreshing/i);

    // Wait for refresh to complete
    await refreshPromise;
  });

  test('refresh button re-enabled after refresh completes', async ({ page }) => {
    await page.goto(`/domain/${TEST_DOMAIN}`);
    await page.waitForLoadState('networkidle');

    const refreshButton = page.getByRole('button', { name: /refresh/i });

    // Perform a refresh
    await refreshButton.click();

    // Wait for refresh to complete (button text returns to normal)
    await expect(refreshButton).toHaveText(/refresh/i);
    await expect(refreshButton).toBeEnabled();
    await expect(refreshButton).toHaveAttribute('aria-busy', 'false');
  });

  test('refresh button disabled during refresh (cannot click twice)', async ({ page }) => {
    await page.goto(`/domain/${TEST_DOMAIN}`);
    await page.waitForLoadState('networkidle');

    const refreshButton = page.getByRole('button', { name: /refresh/i });

    // Intercept with longer delay
    await page.route('/api/collect/domain', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.continue();
    });

    await refreshButton.click();

    // Button should be disabled during refresh
    // This prevents double-clicks
    const isDisabled = await refreshButton.isDisabled();
    expect(isDisabled).toBe(true);
  });
});

/**
 * Tests for loader error states
 * The loader error banner should be visible when API is unreachable
 */
test.describe('Loader Error States', () => {
  test('shows error banner when API is unreachable', async ({ page }) => {
    // Intercept API calls and fail them
    await page.route('/api/domain/**', (route) => {
      route.abort('failed');
    });

    await page.goto(`/domain/${TEST_DOMAIN}`);
    await page.waitForLoadState('networkidle');

    // Should show error banner (red for api_unreachable)
    const errorBanner = page.getByTestId('loader-error-banner');
    await expect(errorBanner).toBeVisible();

    // Should have red/orange styling (error, not yellow)
    await expect(errorBanner).toHaveClass(/red|orange/);
  });

  test('shows error banner with fetch error status', async ({ page }) => {
    // Intercept API calls with error response
    await page.route('/api/domain/**', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    await page.goto(`/domain/${TEST_DOMAIN}`);
    await page.waitForLoadState('networkidle');

    // Should show error banner (orange for fetch_error)
    const errorBanner = page.getByTestId('loader-error-banner');
    await expect(errorBanner).toBeVisible();

    // Should have orange styling (fetch_error)
    await expect(errorBanner).toHaveClass(/orange/);
  });
});

/**
 * Tests for accessibility
 */
test.describe('Domain 360 Accessibility', () => {
  test('refresh button has proper aria attributes', async ({ page }) => {
    await page.goto(`/domain/${TEST_DOMAIN}`);
    await page.waitForLoadState('networkidle');

    const refreshButton = page.getByRole('button', { name: /refresh/i });

    // Should have aria-busy attribute (initially false)
    await expect(refreshButton).toHaveAttribute('aria-busy', 'false');
  });

  test('tabs are properly labeled for screen readers', async ({ page }) => {
    await page.goto(`/domain/${TEST_DOMAIN}`);
    await page.waitForLoadState('networkidle');

    const tablist = page.getByRole('tablist', { name: /dns views/i });
    await expect(tablist).toBeVisible();

    const tabs = page.getByRole('tab');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(0);

    // Each tab should have aria-selected
    for (let i = 0; i < tabCount; i++) {
      const tab = tabs.nth(i);
      await expect(tab).toHaveAttribute('aria-selected');
    }
  });
});
