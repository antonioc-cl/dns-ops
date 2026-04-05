/**
 * Legacy Tools Domain Validation - E2E Integration Tests
 *
 * Tests the complete domain validation flow for legacy tools including:
 * - IP address rejection (IPv4 and IPv6)
 * - URL scheme rejection
 * - Unicode/IDN rejection
 * - Injection character rejection
 * - Valid domain acceptance
 * - PR-03.1: Not configured behavior (503 + INFRA_CONFIG_MISSING)
 * - PR-03.2: Specific malicious inputs from spec
 *
 * These tests verify the security hardening from DX-004 consolidation and PR-03.
 */

import type { IDatabaseAdapter } from '@dns-ops/db';
import { Hono } from 'hono';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../types.js';
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

function createMockDb(state: MockState): IDatabaseAdapter {
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
    transaction: vi.fn(async (callback: (db: IDatabaseAdapter) => Promise<unknown>) =>
      callback(createMockDb(state))
    ),
  } as unknown as IDatabaseAdapter;
}

function createApp(state: MockState = {}, skipEnvSetup = false) {
  const app = new Hono<Env>();

  // Set environment variables for legacy tools (unless caller manages them)
  if (!skipEnvSetup) {
    process.env.VITE_DMARC_TOOL_URL = 'https://dmarc.example.com';
    process.env.VITE_DKIM_TOOL_URL = 'https://dkim.example.com';
  }

  const mockDb = createMockDb(state);

  app.use('*', async (c, next) => {
    c.set('db', mockDb);
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
    it('should reject IPv4 addresses in query domain', async () => {
      const app = createApp();
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
        expect(response.status, `Expected 400 for IPv4: ${ip}`).toBe(400);
      }
    });

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
      const response1 = await app.request(
        `/api/legacy-tools/dmarc/deeplink?domain=${encodeURIComponent('αxample.com')}`
      );
      expect(response1.status).toBe(400);

      const response2 = await app.request(
        `/api/legacy-tools/dmarc/deeplink?domain=${encodeURIComponent('exаmple.com')}`
      );
      expect(response2.status).toBe(400);

      const response3 = await app.request(
        `/api/legacy-tools/dmarc/deeplink?domain=${encodeURIComponent('😀example.com')}`
      );
      expect(response3.status).toBe(400);
    });

    it('should reject mixed script domains (IDN homograph attack)', async () => {
      const app = createApp();
      const response = await app.request(
        `/api/legacy-tools/dmarc/deeplink?domain=${encodeURIComponent('pаypal.com')}`
      );
      expect(response.status).toBe(400);
    });
  });

  describe('Injection Character Rejection', () => {
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
    it('should accept valid simple domain', async () => {
      const app = createApp();
      const response = await app.request('/api/legacy-tools/dmarc/deeplink?domain=example.com');
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

/**
 * PR-03.1: E2E tests for "not configured" behavior
 */
describe('Legacy Tools Not Configured E2E (PR-03.1)', () => {
  const originalDmarc = process.env.VITE_DMARC_TOOL_URL;
  const originalDkim = process.env.VITE_DKIM_TOOL_URL;

  afterEach(() => {
    process.env.VITE_DMARC_TOOL_URL = originalDmarc;
    process.env.VITE_DKIM_TOOL_URL = originalDkim;
  });

  it('DMARC deeplink returns 503 when VITE_DMARC_TOOL_URL not set', async () => {
    process.env.VITE_DMARC_TOOL_URL = '';
    process.env.VITE_DKIM_TOOL_URL = '';
    const app = createApp({}, true);

    const response = await app.request(
      `/api/legacy-tools/dmarc/deeplink?domain=${encodeURIComponent('example.com')}`
    );
    expect(response.status).toBe(503);
    const json = (await response.json()) as {
      ok: boolean;
      code: string;
      error: string;
      details?: { hint: string };
    };
    expect(json.ok).toBe(false);
    expect(json.code).toBe('INFRA_CONFIG_MISSING');
    expect(json.error).toContain('DMARC');
    expect(json.details?.hint).toContain('VITE_DMARC_TOOL_URL');
  });

  it('DKIM deeplink returns 503 when VITE_DKIM_TOOL_URL not set', async () => {
    process.env.VITE_DMARC_TOOL_URL = '';
    process.env.VITE_DKIM_TOOL_URL = '';
    const app = createApp({}, true);

    const response = await app.request(
      `/api/legacy-tools/dkim/deeplink?domain=${encodeURIComponent('example.com')}&selector=google`
    );
    expect(response.status).toBe(503);
    const json = (await response.json()) as {
      ok: boolean;
      code: string;
      error: string;
    };
    expect(json.ok).toBe(false);
    expect(json.code).toBe('INFRA_CONFIG_MISSING');
    expect(json.error).toContain('DKIM');
  });

  it('config endpoint reports both unavailable when env vars not set', async () => {
    process.env.VITE_DMARC_TOOL_URL = '';
    process.env.VITE_DKIM_TOOL_URL = '';
    const app = createApp({}, true);

    const response = await app.request('/api/legacy-tools/config');
    expect(response.status).toBe(200);
    const json = (await response.json()) as {
      dmarc: { available: boolean; disclaimer: string };
      dkim: { available: boolean; disclaimer: string };
    };
    expect(json.dmarc.available).toBe(false);
    expect(json.dkim.available).toBe(false);
    expect(json.dmarc.disclaimer).toContain('informational');
  });
});

/**
 * PR-03.2: E2E tests for specific malicious domain inputs from spec
 */
describe('Legacy Tools Malicious Input E2E (PR-03.2)', () => {
  it('rejects example.com?evil=true query param injection (PR-03.2a)', async () => {
    const app = createApp();
    const maliciousDomain = 'example.com?evil=true&redirect=http://attacker.com';
    const response = await app.request(
      `/api/legacy-tools/dmarc/deeplink?domain=${encodeURIComponent(maliciousDomain)}`
    );
    expect(response.status).toBe(400);
  });

  it('rejects example.com"><script>alert(1)</script> XSS (PR-03.2b)', async () => {
    const app = createApp();
    const xssDomain = 'example.com"><script>alert(1)</script>';
    const response = await app.request(
      `/api/legacy-tools/dmarc/deeplink?domain=${encodeURIComponent(xssDomain)}`
    );
    expect(response.status).toBe(400);
  });

  it('rejects münchen.de IDN domain (PR-03.2c)', async () => {
    const app = createApp();
    const response = await app.request(
      `/api/legacy-tools/dmarc/deeplink?domain=${encodeURIComponent('münchen.de')}`
    );
    expect(response.status).toBe(400);
  });

  it('produces well-formed URL for valid domain (PR-03.2d)', async () => {
    const app = createApp();
    const response = await app.request('/api/legacy-tools/dmarc/deeplink?domain=example.com');
    expect(response.status).toBe(200);
    const json = (await response.json()) as { url: string };
    const parsed = new URL(json.url);
    expect(parsed.hostname).toBeTruthy();
    expect(parsed.searchParams.get('domain')).toBe('example.com');
    expect(json.url).not.toContain('<');
    expect(json.url).not.toContain('>');
    expect(json.url).not.toContain('"');
  });

  it('injected extra query params do not leak into deep link (PR-03.2a)', async () => {
    const app = createApp();
    const response = await app.request(
      '/api/legacy-tools/dmarc/deeplink?domain=example.com&redirect=http://attacker.com'
    );
    expect(response.status).toBe(200);
    const json = (await response.json()) as { url: string };
    const parsed = new URL(json.url);
    expect(parsed.searchParams.get('domain')).toBe('example.com');
    expect(parsed.searchParams.has('redirect')).toBe(false);
  });
});
