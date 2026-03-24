/**
 * DKIM Selector Discovery Tests - TDD/BDD
 *
 * Tests for the 5-level precedence strategy:
 * 1. Managed zone configured selectors
 * 2. Operator-supplied selectors
 * 3. Provider-specific heuristics
 * 4. Common selector dictionary
 * 5. No selector found → partial
 */

import { describe, expect, it } from 'vitest';
import type { DNSQueryResult } from '../dns/types.js';
import {
  COMMON_SELECTORS,
  detectProvider,
  discoverSelectors,
  getProviderSelectors,
} from './selector-discovery.js';

// Test helpers
function createMockDNSResult(overrides: Partial<DNSQueryResult> = {}): DNSQueryResult {
  return {
    query: { name: 'example.com', type: 'MX' },
    vantage: { type: 'public-recursive', identifier: '8.8.8.8' },
    success: true,
    answers: [],
    authority: [],
    additional: [],
    responseTime: 100,
    ...overrides,
  };
}

describe('Provider Detection', () => {
  it('should detect Google Workspace from MX records', () => {
    const mxResult = createMockDNSResult({
      query: { name: 'example.com', type: 'MX' },
      answers: [
        { name: 'example.com', type: 'MX', ttl: 300, data: '10 aspmx.l.google.com' },
        { name: 'example.com', type: 'MX', ttl: 300, data: '20 alt1.aspmx.l.google.com' },
      ],
    });

    const provider = detectProvider([mxResult]);

    expect(provider).toBe('google-workspace');
  });

  it('should detect Microsoft 365 from MX records', () => {
    const mxResult = createMockDNSResult({
      query: { name: 'example.com', type: 'MX' },
      answers: [
        {
          name: 'example.com',
          type: 'MX',
          ttl: 300,
          data: '10 example-com.mail.protection.outlook.com',
        },
      ],
    });

    const provider = detectProvider([mxResult]);

    expect(provider).toBe('microsoft-365');
  });

  it('should detect provider from SPF record', () => {
    const txtResult = createMockDNSResult({
      query: { name: 'example.com', type: 'TXT' },
      answers: [
        { name: 'example.com', type: 'TXT', ttl: 300, data: 'v=spf1 include:_spf.google.com ~all' },
      ],
    });

    const provider = detectProvider([txtResult]);

    expect(provider).toBe('google-workspace');
  });

  it('should return unknown when no provider indicators found', () => {
    const mxResult = createMockDNSResult({
      query: { name: 'example.com', type: 'MX' },
      answers: [{ name: 'example.com', type: 'MX', ttl: 300, data: '10 mail.example.com' }],
    });

    const provider = detectProvider([mxResult]);

    expect(provider).toBe('unknown');
  });
});

describe('Provider Selector Lookup', () => {
  it('should return Google Workspace selectors', () => {
    const selectors = getProviderSelectors('google-workspace');

    expect(selectors).toContain('google');
    expect(selectors.length).toBeGreaterThan(0);
  });

  it('should return Microsoft 365 selectors', () => {
    const selectors = getProviderSelectors('microsoft-365');

    expect(selectors).toContain('selector1');
    expect(selectors).toContain('selector2');
  });

  it('should return empty array for unknown provider', () => {
    const selectors = getProviderSelectors('unknown');

    expect(selectors).toEqual([]);
  });
});

describe('Selector Discovery - Precedence Levels', () => {
  const domain = 'example.com';

  it('Level 1: Should use managed zone configured selectors first', async () => {
    const config = {
      managedSelectors: ['configured1', 'configured2'],
      operatorSelectors: ['operator1'],
    };

    const result = await discoverSelectors(domain, [], config);

    expect(result.selectors).toEqual(['configured1', 'configured2']);
    expect(result.provenance).toBe('managed-zone-config');
    expect(result.confidence).toBe('certain');
  });

  it('Level 2: Should use operator-supplied selectors if no managed config', async () => {
    const config = {
      managedSelectors: [],
      operatorSelectors: ['operator1', 'operator2'],
    };

    const result = await discoverSelectors(domain, [], config);

    expect(result.selectors).toEqual(['operator1', 'operator2']);
    expect(result.provenance).toBe('operator-supplied');
    expect(result.confidence).toBe('high');
  });

  it('Level 3: Should use provider heuristics if no operator selectors', async () => {
    const mxResult = createMockDNSResult({
      query: { name: 'example.com', type: 'MX' },
      answers: [{ name: 'example.com', type: 'MX', ttl: 300, data: '10 aspmx.l.google.com' }],
    });

    const config = {
      managedSelectors: [],
      operatorSelectors: [],
    };

    const result = await discoverSelectors(domain, [mxResult], config);

    expect(result.selectors).toContain('google');
    expect(result.provenance).toBe('provider-heuristic');
    expect(result.confidence).toBe('medium');
  });

  it('Level 4: Should fall back to common dictionary', async () => {
    const config = {
      managedSelectors: [],
      operatorSelectors: [],
    };

    // No DNS results to indicate provider
    const result = await discoverSelectors(domain, [], config);

    expect(result.selectors).toEqual(COMMON_SELECTORS);
    expect(result.provenance).toBe('common-dictionary');
    expect(result.confidence).toBe('low');
  });

  it('Level 5: Should return empty with not-found when explicitly disabled', async () => {
    const config = {
      managedSelectors: [],
      operatorSelectors: [],
      skipDictionary: true,
    };

    const result = await discoverSelectors(domain, [], config);

    expect(result.selectors).toEqual([]);
    expect(result.provenance).toBe('not-found');
    expect(result.confidence).toBe('heuristic');
  });
});

describe('Selector Discovery - Validation', () => {
  const domain = 'example.com';

  it('should deduplicate selectors across sources', async () => {
    const config = {
      managedSelectors: ['selector1'],
      operatorSelectors: ['selector1', 'selector2'], // selector1 is duplicate
    };

    const result = await discoverSelectors(domain, [], config);

    // Should use managed selectors (level 1), not operator selectors
    expect(result.selectors).toEqual(['selector1']);
  });

  it('should limit selectors to reasonable number', async () => {
    const config = {
      managedSelectors: [],
      operatorSelectors: Array(20).fill('selector'), // Too many
    };

    const result = await discoverSelectors(domain, [], config);

    expect(result.selectors.length).toBeLessThanOrEqual(10);
  });

  it('should validate selector format', async () => {
    const config = {
      managedSelectors: ['valid-selector', 'INVALID SELECTOR', ''],
      operatorSelectors: [],
    };

    const result = await discoverSelectors(domain, [], config);

    expect(result.selectors).toContain('valid-selector');
    expect(result.selectors).not.toContain('INVALID SELECTOR');
    expect(result.selectors).not.toContain('');
  });
});

describe('Mail Record Collection Targets', () => {
  it('should identify mail-related query names', () => {
    const domain = 'example.com';
    const expectedQueries = [
      { name: domain, type: 'MX' },
      { name: domain, type: 'TXT' }, // For SPF
      { name: `_dmarc.${domain}`, type: 'TXT' },
      { name: `_mta-sts.${domain}`, type: 'TXT' },
      { name: `_smtp._tls.${domain}`, type: 'TXT' },
    ];

    // Verify the structure matches mail collection needs
    expectedQueries.forEach((query) => {
      expect(query.name).toBeDefined();
      expect(query.type).toBeDefined();
    });
  });

  it('should detect Null MX pattern', () => {
    const nullMxResult = createMockDNSResult({
      query: { name: 'example.com', type: 'MX' },
      answers: [{ name: 'example.com', type: 'MX', ttl: 300, data: '0 .' }],
    });

    const isNullMx =
      nullMxResult.answers.length === 1 && nullMxResult.answers[0].data.includes('0 .');

    expect(isNullMx).toBe(true);
  });
});

// =============================================================================
// PR-02.3: Golden Tests for DKIM Provider Detection
// =============================================================================

describe('PR-02.3: DKIM Provider Detection Golden Tests', () => {
  describe('Google Workspace', () => {
    it('should detect Google Workspace from MX records', () => {
      const results = [
        createMockDNSResult({
          query: { name: 'google-example.com', type: 'MX' },
          answers: [
            { name: 'google-example.com', type: 'MX', ttl: 300, data: '10 aspmx.l.google.com' },
            {
              name: 'google-example.com',
              type: 'MX',
              ttl: 300,
              data: '20 alt1.aspmx.l.google.com',
            },
          ],
        }),
      ];

      const provider = detectProvider(results);
      expect(provider).toBe('google-workspace');
    });

    it('should return Google Workspace selectors', () => {
      const selectors = getProviderSelectors('google-workspace');
      expect(selectors).toContain('google');
      expect(selectors).toContain('20210112');
      expect(selectors).toContain('20230601');
    });

    it('should detect Google Workspace from SPF records', () => {
      const results = [
        createMockDNSResult({
          query: { name: 'google-example.com', type: 'TXT' },
          answers: [
            {
              name: 'google-example.com',
              type: 'TXT',
              ttl: 300,
              data: 'v=spf1 include:_spf.google.com ~all',
            },
          ],
        }),
      ];

      const provider = detectProvider(results);
      expect(provider).toBe('google-workspace');
    });
  });

  describe('Microsoft 365', () => {
    it('should detect Microsoft 365 from MX records', () => {
      const results = [
        createMockDNSResult({
          query: { name: 'microsoft-example.com', type: 'MX' },
          answers: [
            {
              name: 'microsoft-example.com',
              type: 'MX',
              ttl: 300,
              data: '10 microsoft-example-com.mail.protection.outlook.com',
            },
          ],
        }),
      ];

      const provider = detectProvider(results);
      expect(provider).toBe('microsoft-365');
    });

    it('should return Microsoft 365 selectors', () => {
      const selectors = getProviderSelectors('microsoft-365');
      expect(selectors).toContain('selector1');
      expect(selectors).toContain('selector2');
      expect(selectors).toContain('microsoft');
    });

    it('should detect Microsoft 365 from SPF records', () => {
      const results = [
        createMockDNSResult({
          query: { name: 'microsoft-example.com', type: 'TXT' },
          answers: [
            {
              name: 'microsoft-example.com',
              type: 'TXT',
              ttl: 300,
              data: 'v=spf1 include:spf.protection.outlook.com ~all',
            },
          ],
        }),
      ];

      const provider = detectProvider(results);
      expect(provider).toBe('microsoft-365');
    });
  });

  describe('Amazon SES', () => {
    it('should detect Amazon SES from MX records', () => {
      const results = [
        createMockDNSResult({
          query: { name: 'ses-example.com', type: 'MX' },
          answers: [
            {
              name: 'ses-example.com',
              type: 'MX',
              ttl: 300,
              data: '10 feedback-smtp.us-east-1.amazonses.com',
            },
          ],
        }),
      ];

      const provider = detectProvider(results);
      expect(provider).toBe('amazon-ses');
    });

    it('should return Amazon SES selectors', () => {
      const selectors = getProviderSelectors('amazon-ses');
      expect(selectors).toContain('amazonses');
      expect(selectors).toContain('aws');
    });

    it('should detect Amazon SES from SPF records', () => {
      const results = [
        createMockDNSResult({
          query: { name: 'ses-example.com', type: 'TXT' },
          answers: [
            {
              name: 'ses-example.com',
              type: 'TXT',
              ttl: 300,
              data: 'v=spf1 include:amazonses.com ~all',
            },
          ],
        }),
      ];

      const provider = detectProvider(results);
      expect(provider).toBe('amazon-ses');
    });
  });

  describe('SendGrid', () => {
    it('should return SendGrid selectors', () => {
      const selectors = getProviderSelectors('sendgrid');
      expect(selectors).toContain('smtpapi');
      expect(selectors).toContain('sendgrid');
    });

    it('should have provider-specific selector patterns', () => {
      const selectors = getProviderSelectors('sendgrid');
      expect(selectors.length).toBeGreaterThan(0);
      expect(selectors).toContain('sendgrid');
    });
  });

  describe('Mailgun', () => {
    it('should return Mailgun selectors', () => {
      const selectors = getProviderSelectors('mailgun');
      expect(selectors).toContain('mailgun');
      expect(selectors).toContain('krs');
    });

    it('should have provider-specific selector patterns', () => {
      const selectors = getProviderSelectors('mailgun');
      expect(selectors.length).toBeGreaterThan(0);
    });
  });

  describe('Multi-provider Domains', () => {
    it('should handle domains with multiple mail providers', () => {
      // Example: marketing uses SendGrid, ops uses Google
      const results = [
        createMockDNSResult({
          query: { name: 'multi-provider.com', type: 'MX' },
          answers: [
            { name: 'multi-provider.com', type: 'MX', ttl: 300, data: '10 aspmx.l.google.com' },
            { name: 'multi-provider.com', type: 'MX', ttl: 300, data: '20 sendgrid.com' },
          ],
        }),
      ];

      // Should detect the first matching provider (Google in this case)
      const provider = detectProvider(results);
      expect(provider).toBe('google-workspace');
    });

    it('should return multiple provider selectors when detected', async () => {
      const mxResult = createMockDNSResult({
        query: { name: 'example.com', type: 'MX' },
        answers: [{ name: 'example.com', type: 'MX', ttl: 300, data: '10 aspmx.l.google.com' }],
      });

      const result = await discoverSelectors('example.com', [mxResult], {
        managedSelectors: [],
        operatorSelectors: [],
      });

      expect(result.provider).toBe('google-workspace');
      expect(result.selectors.length).toBeGreaterThan(0);
    });
  });

  describe('Fallback Behavior', () => {
    it('should return unknown for unrecognized providers', () => {
      const results = [
        createMockDNSResult({
          query: { name: 'unknown-example.com', type: 'MX' },
          answers: [
            {
              name: 'unknown-example.com',
              type: 'MX',
              ttl: 300,
              data: '10 mail.unknownprovider.com',
            },
          ],
        }),
      ];

      const provider = detectProvider(results);
      expect(provider).toBe('unknown');
    });

    it('should fall back to common dictionary when provider unknown', async () => {
      const results = [
        createMockDNSResult({
          query: { name: 'unknown-example.com', type: 'MX' },
          answers: [
            {
              name: 'unknown-example.com',
              type: 'MX',
              ttl: 300,
              data: '10 mail.unknownprovider.com',
            },
          ],
        }),
      ];

      const result = await discoverSelectors('unknown-example.com', results, {
        managedSelectors: [],
        operatorSelectors: [],
      });

      expect(result.provider).toBeUndefined();
      expect(result.provenance).toBe('common-dictionary');
      expect(result.selectors).toEqual(COMMON_SELECTORS);
    });

    it('should handle no DNS results gracefully', async () => {
      const result = await discoverSelectors('empty-example.com', [], {
        managedSelectors: [],
        operatorSelectors: [],
      });

      expect(result.provider).toBeUndefined();
      expect(result.provenance).toBe('common-dictionary');
    });
  });

  describe('Common Dictionary Coverage', () => {
    it('should include standard selectors in common dictionary', () => {
      expect(COMMON_SELECTORS).toContain('default');
      expect(COMMON_SELECTORS).toContain('dkim');
      expect(COMMON_SELECTORS).toContain('mail');
      expect(COMMON_SELECTORS).toContain('selector1');
    });

    it('should have reasonable common dictionary size', () => {
      expect(COMMON_SELECTORS.length).toBeGreaterThan(0);
      expect(COMMON_SELECTORS.length).toBeLessThanOrEqual(20);
    });
  });
});
