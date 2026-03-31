/**
 * DKIM Selector Discovery - E2E Integration Tests
 *
 * Tests the complete selector discovery flow including:
 * - DNS-003: False-positive fix for selector "found" status
 * - Cascade behavior when configured selectors are invalid
 * - Provider detection and heuristic fallback
 * - updateSelectorResults helper function
 *
 * These tests verify the fix for incorrectly marking selectors as "found".
 */

import { describe, expect, it } from 'vitest';
import type { DNSQueryResult, SelectorAttempt } from './selector-discovery.js';
import {
  buildDkimQueryNames,
  detectProvider,
  discoverSelectors,
  updateSelectorResults,
} from './selector-discovery.js';

describe('DKIM Selector Discovery E2E', () => {
  describe('DNS-003: Selector Found Status', () => {
    /**
     * DNS-003 Bug: Previously, discoverSelectors() marked ALL selectors
     * as `found: true` even though they were only CANDIDATES.
     *
     * This caused false positives in reports - selectors appearing
     * to have DKIM keys when they were just common defaults.
     *
     * The fix: All selectors start with `found: false` and must be
     * verified by actual DNS queries using updateSelectorResults().
     */
    it('should mark managed selectors as found: false initially', async () => {
      const result = await discoverSelectors('example.com', [], {
        managedSelectors: ['selector1', 'selector2'],
      });

      expect(result.provenance).toBe('managed-zone-config');
      expect(result.selectors).toEqual(['selector1', 'selector2']);

      // DNS-003 Fix: All selectors should be marked as NOT FOUND
      for (const attempt of result.attempts) {
        expect(attempt.found).toBe(false);
        expect(attempt.source).toBe('managed-zone-config');
      }
    });

    it('should mark operator selectors as found: false initially', async () => {
      const result = await discoverSelectors('example.com', [], {
        operatorSelectors: ['custom-selector'],
      });

      expect(result.provenance).toBe('operator-supplied');

      // DNS-003 Fix: Not confirmed via DNS
      for (const attempt of result.attempts) {
        expect(attempt.found).toBe(false);
      }
    });

    it('should mark provider heuristic selectors as found: false', async () => {
      // Simulate Google Workspace MX records
      const dnsResults: DNSQueryResult[] = [
        {
          query: { name: 'example.com', type: 'MX' },
          success: true,
          answers: [{ name: 'example.com', type: 'MX', ttl: 3600, data: '10 aspmx.google.com' }],
        },
      ];

      const result = await discoverSelectors('example.com', dnsResults);

      expect(result.provenance).toBe('provider-heuristic');
      expect(result.provider).toBe('google-workspace');

      // DNS-003 Fix: Heuristic candidates are NOT DNS-confirmed
      for (const attempt of result.attempts) {
        expect(attempt.found).toBe(false);
        expect(attempt.source).toBe('provider-heuristic');
      }
    });

    it('should mark common dictionary selectors as found: false', async () => {
      const result = await discoverSelectors('example.com', []);

      expect(result.provenance).toBe('common-dictionary');

      // DNS-003 Fix: Common selectors are guesses, not confirmed
      for (const attempt of result.attempts) {
        expect(attempt.found).toBe(false);
      }
    });

    it('should not return found: true for any selector without DNS verification', async () => {
      // Test all provenance types
      const testCases = [
        { managedSelectors: ['test-selector'] },
        { operatorSelectors: ['test-selector'] },
        { managedSelectors: ['invalid@'], operatorSelectors: ['test-selector'] }, // Invalid cascades
      ];

      for (const config of testCases) {
        const result = await discoverSelectors('example.com', [], config);

        // No selector should be marked as found without DNS verification
        for (const attempt of result.attempts) {
          expect(attempt.found).toBe(false);
        }
      }
    });
  });

  describe('updateSelectorResults Helper', () => {
    /**
     * After querying DNS for DKIM keys, callers should use
     * updateSelectorResults() to mark which selectors were actually found.
     */
    it('should mark selectors as found when DKIM key exists', () => {
      const attempts: SelectorAttempt[] = [
        { selector: 'google', found: false, source: 'provider-heuristic' },
        { selector: 'selector1', found: false, source: 'operator-supplied' },
        { selector: 'default', found: false, source: 'common-dictionary' },
      ];

      // Simulate DNS results where google._domainkey.example.com exists
      const dkimResults: DNSQueryResult[] = [
        {
          query: { name: 'google._domainkey.example.com', type: 'TXT' },
          success: true,
          answers: [
            {
              name: 'google._domainkey.example.com',
              type: 'TXT',
              ttl: 3600,
              data: 'v=DKIM1; k=rsa; p=publickey',
            },
          ],
        },
      ];

      const updated = updateSelectorResults(attempts, dkimResults);

      expect(updated.find((a) => a.selector === 'google')?.found).toBe(true);
      expect(updated.find((a) => a.selector === 'selector1')?.found).toBe(false);
      expect(updated.find((a) => a.selector === 'default')?.found).toBe(false);
    });

    it('should handle failed DNS queries (NXDOMAIN)', () => {
      const attempts: SelectorAttempt[] = [
        { selector: 'default', found: false, source: 'common-dictionary' },
      ];

      // NXDOMAIN - selector doesn't exist
      const dkimResults: DNSQueryResult[] = [
        {
          query: { name: 'default._domainkey.example.com', type: 'TXT' },
          success: false,
          answers: [],
          error: 'NXDOMAIN',
        },
      ];

      const updated = updateSelectorResults(attempts, dkimResults);

      expect(updated[0].found).toBe(false);
    });

    it('should handle multiple selectors with mixed results', () => {
      const attempts: SelectorAttempt[] = [
        { selector: 'google', found: false, source: 'provider-heuristic' },
        { selector: '20230601', found: false, source: 'provider-heuristic' },
        { selector: 'selector1', found: false, source: 'operator-supplied' },
      ];

      const dkimResults: DNSQueryResult[] = [
        {
          query: { name: 'google._domainkey.example.com', type: 'TXT' },
          success: true,
          answers: [
            { name: 'google._domainkey.example.com', type: 'TXT', ttl: 3600, data: 'v=DKIM1...' },
          ],
        },
        {
          query: { name: '20230601._domainkey.example.com', type: 'TXT' },
          success: true,
          answers: [
            { name: '20230601._domainkey.example.com', type: 'TXT', ttl: 3600, data: 'v=DKIM1...' },
          ],
        },
        {
          query: { name: 'selector1._domainkey.example.com', type: 'TXT' },
          success: false,
          answers: [],
        },
      ];

      const updated = updateSelectorResults(attempts, dkimResults);

      expect(updated[0].found).toBe(true); // google - found
      expect(updated[1].found).toBe(true); // 20230601 - found
      expect(updated[2].found).toBe(false); // selector1 - not found
    });

    it('should preserve source provenance when updating found status', () => {
      const attempts: SelectorAttempt[] = [
        { selector: 'google', found: false, source: 'provider-heuristic' },
      ];

      const dkimResults: DNSQueryResult[] = [
        {
          query: { name: 'google._domainkey.example.com', type: 'TXT' },
          success: true,
          answers: [
            { name: 'google._domainkey.example.com', type: 'TXT', ttl: 3600, data: 'v=DKIM1...' },
          ],
        },
      ];

      const updated = updateSelectorResults(attempts, dkimResults);

      expect(updated[0].source).toBe('provider-heuristic'); // Preserved
      expect(updated[0].found).toBe(true); // Updated
    });
  });

  describe('buildDkimQueryNames', () => {
    /**
     * Build correct DKIM query names from selectors
     */
    it('should build correct DKIM query names', () => {
      const queries = buildDkimQueryNames('example.com', ['google', 'selector1']);

      expect(queries).toEqual([
        { name: 'google._domainkey.example.com', type: 'TXT' },
        { name: 'selector1._domainkey.example.com', type: 'TXT' },
      ]);
    });

    it('should handle single selector', () => {
      const queries = buildDkimQueryNames('mail.example.com', ['default']);

      expect(queries).toEqual([{ name: 'default._domainkey.mail.example.com', type: 'TXT' }]);
    });

    it('should handle empty selector list', () => {
      const queries = buildDkimQueryNames('example.com', []);

      expect(queries).toEqual([]);
    });
  });

  describe('Provider Detection', () => {
    it('should detect Google Workspace from MX records', () => {
      const dnsResults: DNSQueryResult[] = [
        {
          query: { name: 'example.com', type: 'MX' },
          success: true,
          answers: [{ name: 'example.com', type: 'MX', ttl: 3600, data: '10 aspmx.google.com' }],
        },
      ];

      const provider = detectProvider(dnsResults);

      expect(provider).toBe('google-workspace');
    });

    it('should detect Microsoft 365 from MX records', () => {
      const dnsResults: DNSQueryResult[] = [
        {
          query: { name: 'example.com', type: 'MX' },
          success: true,
          answers: [{ name: 'example.com', type: 'MX', ttl: 3600, data: '10 mx1.outlook.com' }],
        },
      ];

      const provider = detectProvider(dnsResults);

      expect(provider).toBe('microsoft-365');
    });

    it('should return unknown for unrecognized providers', () => {
      const dnsResults: DNSQueryResult[] = [
        {
          query: { name: 'example.com', type: 'MX' },
          success: true,
          answers: [{ name: 'example.com', type: 'MX', ttl: 3600, data: '10 mail.example.net' }],
        },
      ];

      const provider = detectProvider(dnsResults);

      expect(provider).toBe('unknown');
    });
  });

  describe('Cascade Behavior', () => {
    /**
     * When configured selectors are all invalid, cascade to next level.
     * This is intentional - see function documentation.
     */
    it('should cascade to operator selectors when managed selectors are invalid', async () => {
      const result = await discoverSelectors('example.com', [], {
        managedSelectors: ['invalid@selector', '@#$%'], // All invalid
        operatorSelectors: ['valid-selector'],
      });

      // Should cascade to operator-supplied
      expect(result.provenance).toBe('operator-supplied');
      expect(result.selectors).toEqual(['valid-selector']);
    });

    it('should cascade to provider heuristics when all configured selectors invalid', async () => {
      const dnsResults: DNSQueryResult[] = [
        {
          query: { name: 'example.com', type: 'MX' },
          success: true,
          answers: [{ name: 'example.com', type: 'MX', ttl: 3600, data: '10 aspmx.google.com' }],
        },
      ];

      const result = await discoverSelectors('example.com', dnsResults, {
        managedSelectors: ['invalid@', '@#'], // All invalid
        operatorSelectors: ['also@invalid'], // All invalid
      });

      // Should cascade to provider heuristics
      expect(result.provenance).toBe('provider-heuristic');
      expect(result.provider).toBe('google-workspace');
    });

    it('should record cascade in attempts array', async () => {
      const result = await discoverSelectors('example.com', [], {
        managedSelectors: ['invalid@', 'still@bad'],
        operatorSelectors: ['op-invalid@'],
      });

      // Attempts should track what was tried
      expect(result.attempts.length).toBeGreaterThan(0);
      // All attempts should have found: false
      expect(result.attempts.every((a) => a.found === false)).toBe(true);
    });
  });
});

/**
 * DNS-003 Regression Tests
 *
 * Documents the expected behavior after the fix.
 */
describe('DNS-003 Regression Tests', () => {
  it('should never mark selector as found without DNS verification', async () => {
    // This is the core requirement of DNS-003
    const testConfigs = [
      { managedSelectors: ['selector1'] },
      { operatorSelectors: ['selector1'] },
      { managedSelectors: ['selector1'], operatorSelectors: ['selector2'] },
    ];

    for (const config of testConfigs) {
      const result = await discoverSelectors('example.com', [], config);

      for (const attempt of result.attempts) {
        expect(attempt.found).toBe(false);
      }
    }
  });

  it('should only mark found: true after updateSelectorResults()', () => {
    const attempts: SelectorAttempt[] = [
      { selector: 'test', found: false, source: 'managed-zone-config' },
    ];

    const dkimResults: DNSQueryResult[] = [
      {
        query: { name: 'test._domainkey.example.com', type: 'TXT' },
        success: true,
        answers: [
          { name: 'test._domainkey.example.com', type: 'TXT', ttl: 3600, data: 'v=DKIM1...' },
        ],
      },
    ];

    const updated = updateSelectorResults(attempts, dkimResults);

    expect(updated[0].found).toBe(true);
  });
});
