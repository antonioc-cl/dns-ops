/**
 * E2E Smoke Tests - current shipped UI slice
 */

import { expect, test } from '@playwright/test';
import { waitForDomainPageReady } from './support/domain-fixtures.js';

const TEST_DOMAIN = 'google.com';

test.describe('Homepage', () => {
  test('loads successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /dns ops workbench/i })).toBeVisible();
  });

  test('displays key UI elements', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('textbox', { name: /domain name/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /analyze|check|inspect/i })).toBeVisible();
  });

  test('domain submit navigates to Domain 360', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('textbox', { name: /domain name/i }).fill(TEST_DOMAIN);
    await page.getByRole('button', { name: /analyze|check|inspect/i }).click();
    await expect(page).toHaveURL(new RegExp(`/domain/${TEST_DOMAIN}$`));
    await expect(page.getByRole('heading', { name: new RegExp(TEST_DOMAIN, 'i') })).toBeVisible();
  });
});

test.describe('DNS Domain Flow', () => {
  test('shows current tabs and operator context on the domain page', async ({ page }) => {
    await page.goto(`/domain/${TEST_DOMAIN}`);
    // Wait for React hydration + client-side data load to complete
    await waitForDomainPageReady(page);

    await expect(page.getByRole('tab', { name: /overview/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /^dns$/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /mail/i })).toBeVisible();
    // PR-05.3: Delegation tab is now visible (was previously hidden)
    await expect(page.getByRole('tab', { name: /delegation/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /history/i })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /notes/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /tags/i })).toBeVisible();
    // Simulation panel is present but may show empty state without a snapshot
  });

  test('PR-05.3: delegation tab renders panel on click', async ({ page }) => {
    await page.goto(`/domain/${TEST_DOMAIN}`);
    // Wait for React hydration + client-side data load to complete
    await waitForDomainPageReady(page);

    // Click delegation tab
    const delegationTab = page.getByRole('tab', { name: /delegation/i });
    await delegationTab.click();

    // Verify tab is selected
    await expect(delegationTab).toHaveAttribute('aria-selected', 'true');

    // Wait for delegation panel to render (any state)
    const delegationPanel = page.locator(
      '[data-testid="delegation-no-snapshot-state"], [data-testid="delegation-loading-state"], [data-testid="delegation-no-data-state"], [data-testid="delegation-panel"], [data-testid="delegation-error-state"]'
    );
    await expect(delegationPanel.first()).toBeVisible({ timeout: 10000 });
  });

  test('refresh control is reachable', async ({ page }) => {
    await page.goto(`/domain/${TEST_DOMAIN}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: /refresh/i })).toBeVisible();
  });
});

test.describe('Portfolio Flow', () => {
  test('portfolio workspace is reachable', async ({ page }) => {
    await page.goto('/portfolio');
    await expect(page.getByRole('heading', { name: /portfolio workflows/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /portfolio search/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /saved filters/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /monitored domains/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /alerts/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /shared reports/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /fleet reports/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /template overrides/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /audit log/i })).toBeVisible();
  });
});

test.describe('Responsive Layout', () => {
  test('works on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.getByRole('textbox', { name: /domain name/i })).toBeVisible();
  });

  test('works on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await expect(page.getByRole('textbox', { name: /domain name/i })).toBeVisible();
  });
});
