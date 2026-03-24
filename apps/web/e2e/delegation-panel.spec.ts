/**
 * Delegation Panel E2E Tests
 *
 * PR-05.2: Component tests for 6 states:
 * 1. healthy delegation
 * 2. divergent NS (hasDivergence)
 * 3. lame delegation
 * 4. missing glue
 * 5. DNSSEC present/absent
 * 6. no delegation data collected
 */

import { expect, test } from '@playwright/test';

const TEST_DOMAIN = 'example.com';
const SNAPSHOT_ID = 'snap-test-123';

test.describe('DelegationPanel Component', () => {
  test.describe.configure({ mode: 'serial' });

  test.describe('6 States Rendering', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to domain page
      await page.goto(`/domain/${TEST_DOMAIN}`);
      await page.waitForLoadState('networkidle');
    });

    /**
     * State 1: Healthy delegation
     */
    test('should render healthy delegation state correctly', async ({ page }) => {
      // Intercept delegation API to return healthy data
      await page.route(`**/api/snapshot/${SNAPSHOT_ID}/delegation`, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            delegation: {
              domain: TEST_DOMAIN,
              parentZone: 'com.',
              nameServers: [
                { name: 'a.iana-servers.net', source: 'delegation' },
                { name: 'b.iana-servers.net', source: 'delegation' },
              ],
              glue: [
                { name: 'a.iana-servers.net', type: 'A', address: '199.43.135.53' },
                { name: 'a.iana-servers.net', type: 'AAAA', address: '2001:500:8f::53' },
                { name: 'b.iana-servers.net', type: 'A', address: '199.43.133.53' },
                { name: 'b.iana-servers.net', type: 'AAAA', address: '2001:500:8d::53' },
              ],
              hasDivergence: false,
              hasDnssec: true,
            },
          }),
        });
      });

      await page.route(`**/api/snapshot/${SNAPSHOT_ID}/delegation/issues`, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ issues: [] }),
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Should show delegation data
      await expect(page.locator('text=/Parent Zone Delegation/i')).toBeVisible();
      await expect(page.locator('text=/Name Servers/i')).toBeVisible();
      await expect(page.locator('text=/Glue Records/i')).toBeVisible();

      // Should show name servers
      await expect(page.locator('code:text("a.iana-servers.net")')).toBeVisible();

      // DNSSEC should be present (green)
      await expect(page.locator('text=/DNSSEC.*present/i')).toBeVisible();

      // Divergence should be none (green)
      await expect(page.locator('text=/Divergence.*none/i')).toBeVisible();

      // No issues should be shown
      const issueCards = page.locator('[class*="rounded-lg border"]').filter({ has: page.locator('[class*="rounded-full"]') });
      await expect(issueCards).toHaveCount(0);
    });

    /**
     * State 2: Divergent NS (hasDivergence)
     */
    test('should render divergent NS state with warning', async ({ page }) => {
      await page.route(`**/api/snapshot/${SNAPSHOT_ID}/delegation`, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            delegation: {
              domain: TEST_DOMAIN,
              parentZone: 'com.',
              nameServers: [
                { name: 'ns1.provider.com', source: 'delegation' },
                { name: 'ns2.provider.com', source: 'delegation' },
              ],
              glue: [
                { name: 'ns1.provider.com', type: 'A', address: '192.0.2.1' },
                { name: 'ns2.provider.com', type: 'A', address: '192.0.2.2' },
              ],
              hasDivergence: true,
              hasDnssec: true,
            },
          }),
        });
      });

      await page.route(`**/api/snapshot/${SNAPSHOT_ID}/delegation/issues`, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            issues: [
              {
                type: 'ns-divergence',
                severity: 'high',
                description: 'NS records differ between delegation and authoritative response',
                details: { expected: ['ns1.provider.com'], actual: ['ns1.other.com'] },
                evidence: [
                  { queryName: TEST_DOMAIN, queryType: 'NS', source: 'delegation', status: 'success', data: { records: ['ns1.provider.com'] } },
                  { queryName: TEST_DOMAIN, queryType: 'NS', source: 'authoritative', status: 'success', data: { records: ['ns1.other.com'] } },
                ],
              },
            ],
          }),
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Should show divergence badge (red)
      await expect(page.locator('text=/Divergence.*detected/i')).toBeVisible();

      // Should show issue card
      await expect(page.locator('text=/NS records differ/i')).toBeVisible();
      await expect(page.locator('text=/high severity/i')).toBeVisible();

      // Evidence should be expandable
      const evidenceButton = page.getByRole('button', { name: /Evidence/i });
      await expect(evidenceButton).toBeVisible();
    });

    /**
     * State 3: Lame delegation
     */
    test('should render lame delegation state', async ({ page }) => {
      await page.route(`**/api/snapshot/${SNAPSHOT_ID}/delegation`, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            delegation: {
              domain: TEST_DOMAIN,
              parentZone: 'com.',
              nameServers: [
                { name: 'ns.lame-delegation.com', source: 'delegation' },
              ],
              glue: [
                { name: 'ns.lame-delegation.com', type: 'A', address: '192.0.2.1' },
              ],
              hasDivergence: true,
              hasDnssec: false,
            },
          }),
        });
      });

      await page.route(`**/api/snapshot/${SNAPSHOT_ID}/delegation/issues`, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            issues: [
              {
                type: 'lame-delegation',
                severity: 'critical',
                description: 'Name server is not authoritative for the delegated zone',
                details: {},
                evidence: [],
              },
            ],
          }),
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Should show critical issue
      await expect(page.locator('text=/lame-delegation/i')).toBeVisible();
      await expect(page.locator('text=/critical severity/i')).toBeVisible();
    });

    /**
     * State 4: Missing glue
     */
    test('should render missing glue state', async ({ page }) => {
      await page.route(`**/api/snapshot/${SNAPSHOT_ID}/delegation`, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            delegation: {
              domain: TEST_DOMAIN,
              parentZone: 'com.',
              nameServers: [
                { name: 'ns1.missing-glue.com', source: 'delegation' },
                { name: 'ns2.missing-glue.com', source: 'delegation' },
              ],
              glue: [], // No glue records
              hasDivergence: false,
              hasDnssec: false,
            },
          }),
        });
      });

      await page.route(`**/api/snapshot/${SNAPSHOT_ID}/delegation/issues`, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            issues: [
              {
                type: 'missing-glue',
                severity: 'medium',
                description: 'Glue records missing for name servers outside parent zone',
                details: {},
                evidence: [],
              },
            ],
          }),
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Should show "No glue records found"
      await expect(page.locator('text=/No glue records found/i')).toBeVisible();

      // Should show glue issue
      await expect(page.locator('text=/missing glue/i')).toBeVisible();
    });

    /**
     * State 5: DNSSEC absent
     */
    test('should render DNSSEC absent state', async ({ page }) => {
      await page.route(`**/api/snapshot/${SNAPSHOT_ID}/delegation`, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            delegation: {
              domain: TEST_DOMAIN,
              parentZone: 'com.',
              nameServers: [
                { name: 'ns1.dnssec-absent.com', source: 'delegation' },
              ],
              glue: [
                { name: 'ns1.dnssec-absent.com', type: 'A', address: '192.0.2.1' },
              ],
              hasDivergence: false,
              hasDnssec: false, // DNSSEC absent
            },
          }),
        });
      });

      await page.route(`**/api/snapshot/${SNAPSHOT_ID}/delegation/issues`, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            issues: [
              {
                type: 'dnssec-missing',
                severity: 'low',
                description: 'DNSSEC is not enabled for this domain',
                details: {},
                evidence: [],
              },
            ],
          }),
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Should show DNSSEC absent (gray)
      await expect(page.locator('text=/DNSSEC.*absent/i')).toBeVisible();
    });

    /**
     * State 6: No delegation data collected
     */
    test('should render empty state when no delegation data', async ({ page }) => {
      await page.route(`**/api/snapshot/${SNAPSHOT_ID}/delegation`, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ delegation: null }),
        });
      });

      await page.route(`**/api/snapshot/${SNAPSHOT_ID}/delegation/issues`, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ issues: [] }),
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Should show empty state
      await expect(page.locator('text=/No delegation data available/i')).toBeVisible();
      await expect(page.locator('text=/Delegation collection may not have been enabled/i')).toBeVisible();
    });
  });

  test.describe('Delegation Panel Elements', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/domain/${TEST_DOMAIN}`);
      await page.waitForLoadState('networkidle');
    });

    test('should show Parent Zone Delegation section', async ({ page }) => {
      await page.route(`**/api/snapshot/${SNAPSHOT_ID}/delegation`, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            delegation: {
              domain: TEST_DOMAIN,
              parentZone: 'com.',
              nameServers: [],
              glue: [],
              hasDivergence: false,
              hasDnssec: false,
            },
          }),
        });
      });

      await page.route(`**/api/snapshot/${SNAPSHOT_ID}/delegation/issues`, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ issues: [] }),
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      await expect(page.locator('text=/Parent Zone Delegation/i')).toBeVisible();
    });

    test('should show Name Servers section with data', async ({ page }) => {
      await page.route(`**/api/snapshot/${SNAPSHOT_ID}/delegation`, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            delegation: {
              domain: TEST_DOMAIN,
              parentZone: 'com.',
              nameServers: [
                { name: 'ns1.test.com', source: 'delegation' },
                { name: 'ns2.test.com', source: 'delegation' },
              ],
              glue: [],
              hasDivergence: false,
              hasDnssec: false,
            },
          }),
        });
      });

      await page.route(`**/api/snapshot/${SNAPSHOT_ID}/delegation/issues`, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ issues: [] }),
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      await expect(page.locator('text=/Name Servers/i')).toBeVisible();
      await expect(page.locator('code:text("ns1.test.com")')).toBeVisible();
      await expect(page.locator('text=/via delegation/i')).toBeVisible();
    });

    test('should show Glue Records section with A/AAAA badges', async ({ page }) => {
      await page.route(`**/api/snapshot/${SNAPSHOT_ID}/delegation`, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            delegation: {
              domain: TEST_DOMAIN,
              parentZone: 'com.',
              nameServers: [{ name: 'ns.test.com', source: 'delegation' }],
              glue: [
                { name: 'ns.test.com', type: 'A', address: '192.0.2.1' },
                { name: 'ns.test.com', type: 'AAAA', address: '2001:db8::1' },
              ],
              hasDivergence: false,
              hasDnssec: false,
            },
          }),
        });
      });

      await page.route(`**/api/snapshot/${SNAPSHOT_ID}/delegation/issues`, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ issues: [] }),
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      await expect(page.locator('text=/Glue Records/i')).toBeVisible();
      await expect(page.locator('text=/A/i').first()).toBeVisible();
      await expect(page.locator('text=/AAAA/i').first()).toBeVisible();
    });

    test('should expand evidence when clicking Evidence button', async ({ page }) => {
      await page.route(`**/api/snapshot/${SNAPSHOT_ID}/delegation`, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            delegation: {
              domain: TEST_DOMAIN,
              parentZone: 'com.',
              nameServers: [{ name: 'ns.test.com', source: 'delegation' }],
              glue: [],
              hasDivergence: true,
              hasDnssec: false,
            },
          }),
        });
      });

      await page.route(`**/api/snapshot/${SNAPSHOT_ID}/delegation/issues`, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            issues: [
              {
                type: 'ns-divergence',
                severity: 'medium',
                description: 'Name servers differ',
                details: {},
                evidence: [
                  { queryName: TEST_DOMAIN, queryType: 'NS', source: 'delegation', status: 'success', data: { records: ['ns1.com'] } },
                ],
              },
            ],
          }),
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Click Evidence button
      const evidenceButton = page.getByRole('button', { name: /Evidence/i });
      await evidenceButton.click();

      // Should show observation evidence
      await expect(page.locator('text=/Observation Evidence/i')).toBeVisible();
    });

    test('should show raw data when clicking Raw button', async ({ page }) => {
      await page.route(`**/api/snapshot/${SNAPSHOT_ID}/delegation`, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            delegation: {
              domain: TEST_DOMAIN,
              parentZone: 'com.',
              nameServers: [{ name: 'ns.test.com', source: 'delegation' }],
              glue: [],
              hasDivergence: true,
              hasDnssec: false,
            },
          }),
        });
      });

      await page.route(`**/api/snapshot/${SNAPSHOT_ID}/delegation/issues`, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            issues: [
              {
                type: 'ns-divergence',
                severity: 'medium',
                description: 'Name servers differ',
                details: {},
                evidence: [
                  { queryName: TEST_DOMAIN, queryType: 'NS', source: 'delegation', status: 'success', data: { raw: 'ns1.com' } },
                ],
              },
            ],
          }),
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Expand evidence
      await page.getByRole('button', { name: /Evidence/i }).click();

      // Click Raw button
      const rawButton = page.getByRole('button', { name: /Raw/i });
      await rawButton.click();

      // Should show JSON data
      await expect(page.locator('pre')).toBeVisible();
    });
  });

  test.describe('Delegation Tab Visibility', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/domain/${TEST_DOMAIN}`);
      await page.waitForLoadState('networkidle');
    });

    test('should show delegation tab when delegation data exists', async ({ page }) => {
      await page.route(`**/api/snapshot/${SNAPSHOT_ID}/delegation`, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            delegation: {
              domain: TEST_DOMAIN,
              parentZone: 'com.',
              nameServers: [{ name: 'ns.test.com', source: 'delegation' }],
              glue: [],
              hasDivergence: false,
              hasDnssec: true,
            },
          }),
        });
      });

      await page.route(`**/api/snapshot/${SNAPSHOT_ID}/delegation/issues`, (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ issues: [] }),
        });
      });

      // Click delegation tab
      const delegationTab = page.getByRole('tab', { name: /delegation/i });
      await delegationTab.click();

      await page.waitForLoadState('networkidle');

      // Should show delegation content
      await expect(page.locator('text=/Parent Zone Delegation/i')).toBeVisible();
    });
  });
});
