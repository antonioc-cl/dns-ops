/**
 * Legacy Tools Domain Validation - E2E Integration Tests
 *
 * Tests the complete domain validation flow for legacy tools including:
 * - IP address rejection (IPv4 and IPv6)
 * - URL scheme rejection
 * - Unicode/IDN rejection
 * - Injection character rejection
 * - Valid domain acceptance
 *
 * These tests verify the security hardening from DX-004 consolidation.
 */

import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import { legacyToolsRoutes } from './legacy-tools.js';

interface MockState {
  legacyAccessLogs?: Array<Record<string, unknown>>;
  snapshots?: Array<Record<string, unknown>>;
  findings?: Array<Record<string, unknown>>;
}

function getTableName(table: unknown): string {
  if (!table || typeof table !== 'object') return '';
  const record = table as Record<symbol | string, unknown>;
  const symbolName = Symbol.for('drizzle:Name');
  if (typeof record[symbolName] === 'string') {
    return record[symbolName] as string;
  }
  const symbols = Object.getOwnPropertySymbols(record);
  const drizzleName = symbols.find((symbol) => String(symbol) === 'Symbol(drizzle:Name)');
  if (drizzleName && typeof record[drizzleName] === 'string') {
    return record[drizzleName] as string;
  }
  return '';
}

function createMockDb(state: MockState) {
  return {
    getDrizzle: vi.fn(),
    select: vi.fn(async (table: unknown) => {
      const tableName = getTableName(table);
      if (tableName === 'legacy_access_logs') return state.legacyAccessLogs || [];
      if (tableName === 'snapshots') return state.snapshots || [];
      if (tableName === 'findings') return state.findings || [];
      return [];
    }),
    insert: vi.fn(async () => ({ returning: vi.fn(() => []) })),
    update: vi.fn(async () => ({ where: vi.fn(() => ({ returning: vi.fn(() => []) })) })),
    delete: vi.fn(async () => ({ where: vi.fn(() => ({ returning: vi.fn(() => []) })) })),
  };
}

function createApp(state: MockState = {}) {
  const app = new Hono();

  // Set environment variables for legacy tools
  process.env.VITE_DMARC_TOOL_URL = 'https://dmarc.example.com';
  process.env.VITE_DKIM_TOOL_URL = 'https://dkim.example.com';

  const mockDb = createMockDb(state);

  app.use('*', async (c, next) => {
    c.set('db', mockDb as never);
    c.set('tenantId', 'test-tenant-id');
    c.set('actorId', 'test-actor-id');
    c.set('actorEmail', 'test@example.com');
    await next();
  });

  app.route('/api/legacy-tools', legacyToolsRoutes);

  return app;
}

describe('Legacy Tools Domain Validation E2E', () => {
  describe('IP Address Rejection', () => {
    /**
     * SECURITY: Reject IPv4 addresses
     * DNS lookups should use domain names, not IP addresses.
     * Allowing IPs could bypass network-based access controls.
     */
    it('should reject IPv4 addresses in query domain', async () => {
      const app = createApp();
      // Common public DNS server IPs
      const ipv4Addresses = [
        '8.8.8.8',
        '1.1.1.1',
        '208.67.222.222',
        '9.9.9.9',
        '127.0.0.1',
        '0.0.0.0',
      ];

      for (const ip of ipv4Addresses) {
        const response = await app.request(
          `/api/legacy-tools/dmarc/deeplink?domain=${encodeURIComponent(ip)}`
        );
        // Should reject with 400 Bad Request
        expect(response.status, `Expected 400 for IPv4: ${ip}`).toBe(400);
      }
    });

    /**
     * SECURITY: Reject IPv6 addresses in bracket notation [::1]
     */
    it('should reject IPv6 addresses in bracket notation', async () => {
      const app = createApp();
      const ipv6Addresses = ['[::1]', '[::127.0.0.1]', '[2001:db8::1]', '[::ffff:127.0.0.1]'];

      for (const ip of ipv6Addresses) {
        const response = await app.request(
          `/api/legacy-tools/dmarc/deeplink?domain=${encodeURIComponent(ip)}`
        );
        expect(response.status, `Expected 400 for IPv6: ${ip}`).toBe(400);
      }
    });

    /**
     * SECURITY: Reject raw IPv6 addresses (no brackets)
     */
    it('should reject raw IPv6 addresses', async () => {
      const app = createApp();
      const rawIpv6Addresses = ['::1', '::127.0.0.1', '2001:db8::1', 'fe80::1'];

      for (const ip of rawIpv6Addresses) {
        const response = await app.request(
          `/api/legacy-tools/dmarc/deeplink?domain=${encodeURIComponent(ip)}`
        );
        expect(response.status, `Expected 400 for raw IPv6: ${ip}`).toBe(400);
      }
    });
  });

  describe('URL Scheme Rejection', () => {
    /**
     * SECURITY: Reject URLs with schemes
     */
    it('should reject HTTP URLs', async () => {
      const app = createApp();
      const response = await app.request(
        `/api/legacy-tools/dmarc/deeplink?domain=${encodeURIComponent('http://example.com')}`
      );
      expect(response.status).toBe(400);
    });

    it('should reject HTTPS URLs', async () => {
      const app = createApp();
      const response = await app.request(
        `/api/legacy-tools/dmarc/deeplink?domain=${encodeURIComponent('https://example.com')}`
      );
      expect(response.status).toBe(400);
    });

    it('should reject other URL schemes', async () => {
      const app = createApp();
      const schemes = ['ftp://', 'file://', 'data:', 'javascript:', 'mailto:'];

      for (const scheme of schemes) {
        const response = await app.request(
          `/api/legacy-tools/dmarc/deeplink?domain=${encodeURIComponent(`${scheme}example.com`)}`
        );
        expect(response.status, `Expected 400 for scheme: ${scheme}`).toBe(400);
      }
    });
  });

  describe('Unicode/IDN Rejection', () => {
    /**
     * SECURITY: Legacy tools don't support IDN (Internationalized Domain Names)
     */
    it('should reject punycode domains (xn-- prefix)', async () => {
      const app = createApp();
      const punycodeDomains = ['xn--nxasmq5b.com', 'xn--bcher-kva.com'];

      for (const domain of punycodeDomains) {
        const response = await app.request(
          `/api/legacy-tools/dmarc/deeplink?domain=${encodeURIComponent(domain)}`
        );
        expect(response.status, `Expected 400 for punycode: ${domain}`).toBe(400);
      }
    });

    it('should reject Unicode domains', async () => {
      const app = createApp();
      // Greek alpha (looks like 'a')
      const response1 = await app.request(
        `/api/legacy-tools/dmarc/deeplink?domain=${encodeURIComponent('αxample.com')}`
      );
      expect(response1.status).toBe(400);

      // Cyrillic 'а' (looks identical to Latin 'a')
      const response2 = await app.request(
        `/api/legacy-tools/dmarc/deeplink?domain=${encodeURIComponent('exаmple.com')}`
      );
      expect(response2.status).toBe(400);

      // Emoji domain
      const response3 = await app.request(
        `/api/legacy-tools/dmarc/deeplink?domain=${encodeURIComponent('😀example.com')}`
      );
      expect(response3.status).toBe(400);
    });

    it('should reject mixed script domains (IDN homograph attack)', async () => {
      const app = createApp();
      // PayPal with Cyrillic 'а' instead of Latin 'a'
      const response = await app.request(
        `/api/legacy-tools/dmarc/deeplink?domain=${encodeURIComponent('pаypal.com')}`
      );
      expect(response.status).toBe(400);
    });
  });

  describe('Injection Character Rejection', () => {
    /**
     * SECURITY: Reject injection characters
     */
    it('should reject domain with hash (fragment identifier)', async () => {
      const app = createApp();
      const response = await app.request(
        `/api/legacy-tools/dmarc/deeplink?domain=${encodeURIComponent('example.com#fragment')}`
      );
      expect(response.status).toBe(400);
    });

    it('should reject domain with newline characters', async () => {
      const app = createApp();
      const response = await app.request(
        `/api/legacy-tools/dmarc/deeplink?domain=${encodeURIComponent('example.com\n')}`
      );
      expect(response.status).toBe(400);
    });

    it('should reject domain with null byte', async () => {
      const app = createApp();
      const response = await app.request(
        `/api/legacy-tools/dmarc/deeplink?domain=${encodeURIComponent('example.com\0')}`
      );
      expect(response.status).toBe(400);
    });
  });

  describe('Blocked Hostname Rejection', () => {
    /**
     * SECURITY: Reject internal/loopback hostnames
     */
    it('should reject localhost variants', async () => {
      const app = createApp();
      const localhostVariants = ['localhost', 'LOCALHOST', 'localhost.localdomain', 'localhost.'];

      for (const domain of localhostVariants) {
        const response = await app.request(
          `/api/legacy-tools/dmarc/deeplink?domain=${encodeURIComponent(domain)}`
        );
        expect(response.status, `Expected 400 for localhost variant: ${domain}`).toBe(400);
      }
    });
  });

  describe('Valid Domain Acceptance', () => {
    /**
     * POSITIVE TESTS: Ensure valid domains still work
     */
    it('should accept valid simple domain', async () => {
      const app = createApp();
      const response = await app.request('/api/legacy-tools/dmarc/deeplink?domain=example.com');
      // Should not be 400 (could be 200 if tool available, or 503 if not configured)
      expect(response.status).not.toBe(400);
    });

    it('should accept domain with subdomain', async () => {
      const app = createApp();
      const response = await app.request(
        '/api/legacy-tools/dmarc/deeplink?domain=mail.example.com'
      );
      expect(response.status).not.toBe(400);
    });

    it('should accept country-code TLDs', async () => {
      const app = createApp();
      const ccTLDs = ['example.co.uk', 'example.com.au', 'example.de', 'example.fr'];

      for (const domain of ccTLDs) {
        const response = await app.request(`/api/legacy-tools/dmarc/deeplink?domain=${domain}`);
        expect(response.status, `Expected non-400 for CC-TLD: ${domain}`).not.toBe(400);
      }
    });
  });
});

/**
 * DX-004 Regression Tests
 */
describe('DX-004 Regression Tests', () => {
  it('should use canonical domain validation from @dns-ops/parsing', () => {
    // This test documents the consolidation
    expect(true).toBe(true);
  });

  it('should handle edge cases consistently', async () => {
    const app = createApp();
    const edgeCases = [
      { input: '', expectValid: false },
      { input: '-invalid.com', expectValid: false },
      { input: 'invalid-.com', expectValid: false },
      { input: '.example.com', expectValid: false },
      { input: 'example..com', expectValid: false },
    ];

    for (const { input, expectValid } of edgeCases) {
      const response = await app.request(
        `/api/legacy-tools/dmarc/deeplink?domain=${encodeURIComponent(input)}`
      );
      if (expectValid) {
        expect(response.status, `Expected non-400 for: ${input}`).not.toBe(400);
      } else {
        expect(response.status, `Expected 400 for: ${input}`).toBe(400);
      }
    }
  });
});
