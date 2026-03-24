/**
 * DiscoveredSelectors E2E Tests
 *
 * PR-02.4: Component test for DiscoveredSelectors with different provenance values
 * Verify each renders with visually distinct label/badge.
 */

import { expect, test } from '@playwright/test';

const TEST_DOMAIN = 'google.com';

test.describe('PR-02.5: Mail Findings Preview Label', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    // Navigate to domain page with mail tab
    await page.goto(`/domain/${TEST_DOMAIN}?tab=mail`);
    await page.waitForLoadState('networkidle');
  });

  test('should display preview badge in mail findings section', async ({ page }) => {
    // Intercept mail check API to return results
    await page.route('**/api/mail/check/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          dmarc: { present: true, valid: true, errors: [] },
          dkim: { present: true, valid: true, errors: [], selector: 'google', selectorProvenance: 'provider-heuristic' },
          spf: { present: true, valid: true, errors: [] },
        }),
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check preview badge is visible
    const previewBadge = page.getByTestId('mail-preview-badge');
    await expect(previewBadge).toBeVisible();
    await expect(previewBadge).toHaveText('Preview');
  });

  test('should display preview disclaimer referencing legacy tools', async ({ page }) => {
    await page.route('**/api/mail/check/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          dmarc: { present: true, valid: true, errors: [] },
          dkim: { present: true, valid: true, errors: [] },
          spf: { present: true, valid: true, errors: [] },
        }),
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check preview disclaimer is visible
    const disclaimer = page.getByTestId('mail-preview-disclaimer');
    await expect(disclaimer).toBeVisible();
    await expect(disclaimer).toContainText('Preview');
    await expect(disclaimer).toContainText('authoritative results');
    await expect(disclaimer).toContainText('legacy');
  });

  test('should show preview badge styling', async ({ page }) => {
    await page.route('**/api/mail/check/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          dmarc: { present: true, valid: true, errors: [] },
          dkim: { present: true, valid: true, errors: [] },
          spf: { present: true, valid: true, errors: [] },
        }),
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const previewBadge = page.getByTestId('mail-preview-badge');
    const classes = await previewBadge.getAttribute('class');
    // Badge should have purple styling to indicate preview/experimental
    expect(classes).toContain('purple');
  });
});

test.describe('DiscoveredSelectors Component', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    // Navigate to domain page with mail tab
    await page.goto(`/domain/${TEST_DOMAIN}?tab=mail`);
    await page.waitForLoadState('networkidle');
  });

  test.describe('Confidence Badge Rendering', () => {
    test('should render certain confidence with green badge', async ({ page }) => {
      // Intercept selectors API response
      await page.route('**/api/snapshot/*/selectors', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            selectors: [
              {
                selector: 'google',
                found: true,
                provenance: 'managed-zone-config',
                confidence: 'certain',
              },
            ],
          }),
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Check that the certain badge is visible
      const certainBadge = page.locator('text=/certain/i');
      await expect(certainBadge).toBeVisible();
      
      // The badge should have green styling (check parent contains green)
      const badgeElement = certainBadge.locator('..');
      const classes = await badgeElement.getAttribute('class');
      expect(classes).toContain('green');
    });

    test('should render high confidence with blue badge', async ({ page }) => {
      await page.route('**/api/snapshot/*/selectors', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            selectors: [
              {
                selector: 'operator1',
                found: true,
                provenance: 'operator-supplied',
                confidence: 'high',
              },
            ],
          }),
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      const highBadge = page.locator('text=/high/i');
      await expect(highBadge).toBeVisible();
      
      const badgeElement = highBadge.locator('..');
      const classes = await badgeElement.getAttribute('class');
      expect(classes).toContain('blue');
    });

    test('should render medium confidence with yellow badge', async ({ page }) => {
      await page.route('**/api/snapshot/*/selectors', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            selectors: [
              {
                selector: 'google',
                found: true,
                provenance: 'provider-heuristic',
                confidence: 'medium',
                provider: 'google-workspace',
              },
            ],
          }),
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      const mediumBadge = page.locator('text=/medium/i');
      await expect(mediumBadge).toBeVisible();
      
      const badgeElement = mediumBadge.locator('..');
      const classes = await badgeElement.getAttribute('class');
      expect(classes).toContain('yellow');
    });

    test('should render low confidence with orange badge', async ({ page }) => {
      await page.route('**/api/snapshot/*/selectors', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            selectors: [
              {
                selector: 'default',
                found: false,
                provenance: 'common-dictionary',
                confidence: 'low',
              },
            ],
          }),
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      const lowBadge = page.locator('text=/low/i');
      await expect(lowBadge).toBeVisible();
      
      const badgeElement = lowBadge.locator('..');
      const classes = await badgeElement.getAttribute('class');
      expect(classes).toContain('orange');
    });

    test('should render heuristic confidence with gray badge', async ({ page }) => {
      await page.route('**/api/snapshot/*/selectors', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            selectors: [
              {
                selector: 'selector1',
                found: false,
                provenance: 'not-found',
                confidence: 'heuristic',
              },
            ],
          }),
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      const heuristicBadge = page.locator('text=/heuristic/i');
      await expect(heuristicBadge).toBeVisible();
      
      const badgeElement = heuristicBadge.locator('..');
      const classes = await badgeElement.getAttribute('class');
      expect(classes).toContain('gray');
    });
  });

  test.describe('Provenance Label Formatting', () => {
    test('should format managed-zone-config provenance', async ({ page }) => {
      await page.route('**/api/snapshot/*/selectors', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            selectors: [
              {
                selector: 'configured',
                found: true,
                provenance: 'managed-zone-config',
                confidence: 'certain',
              },
            ],
          }),
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      await expect(page.locator('text=/managed zone configuration/i')).toBeVisible();
    });

    test('should format operator-supplied provenance', async ({ page }) => {
      await page.route('**/api/snapshot/*/selectors', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            selectors: [
              {
                selector: 'operator1',
                found: true,
                provenance: 'operator-supplied',
                confidence: 'high',
              },
            ],
          }),
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      await expect(page.locator('text=/operator supplied/i')).toBeVisible();
    });

    test('should format provider-heuristic provenance', async ({ page }) => {
      await page.route('**/api/snapshot/*/selectors', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            selectors: [
              {
                selector: 'google',
                found: true,
                provenance: 'provider-heuristic',
                confidence: 'medium',
                provider: 'google-workspace',
              },
            ],
          }),
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      await expect(page.locator('text=/provider heuristic detection/i')).toBeVisible();
    });

    test('should format common-dictionary provenance', async ({ page }) => {
      await page.route('**/api/snapshot/*/selectors', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            selectors: [
              {
                selector: 'selector1',
                found: false,
                provenance: 'common-dictionary',
                confidence: 'low',
              },
            ],
          }),
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      await expect(page.locator('text=/common selector dictionary/i')).toBeVisible();
    });

    test('should format not-found provenance', async ({ page }) => {
      await page.route('**/api/snapshot/*/selectors', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            selectors: [
              {
                selector: 'unknown',
                found: false,
                provenance: 'not-found',
                confidence: 'heuristic',
              },
            ],
          }),
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      await expect(page.locator('text=/not found/i')).toBeVisible();
    });
  });

  test.describe('Found vs Not Found States', () => {
    test('should render found selector with green styling', async ({ page }) => {
      await page.route('**/api/snapshot/*/selectors', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            selectors: [
              {
                selector: 'google',
                found: true,
                provenance: 'managed-zone-config',
                confidence: 'certain',
              },
            ],
          }),
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Find the selector container
      const selectorContainer = page.locator('text=/google\\._domainkey/i').locator('..');
      const classes = await selectorContainer.getAttribute('class');
      expect(classes).toContain('green');
    });

    test('should render not-found selector with gray styling', async ({ page }) => {
      await page.route('**/api/snapshot/*/selectors', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            selectors: [
              {
                selector: 'unknown',
                found: false,
                provenance: 'not-found',
                confidence: 'heuristic',
              },
            ],
          }),
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      const selectorContainer = page.locator('text=/unknown\\._domainkey/i').locator('..');
      const classes = await selectorContainer.getAttribute('class');
      expect(classes).toContain('gray');
    });
  });

  test.describe('Empty State', () => {
    test('should render empty state when no selectors', async ({ page }) => {
      await page.route('**/api/snapshot/*/selectors', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ selectors: [] }),
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      await expect(page.locator('text=/no dkim selectors discovered/i')).toBeVisible();
    });
  });
});
