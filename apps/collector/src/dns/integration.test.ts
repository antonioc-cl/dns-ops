/**
 * DNS Collection Integration Tests - Bead dns-ops-1j4.5.3
 *
 * End-to-end smoke tests for public live DNS, with optional controllable authoritative fixtures.
 *
 * These tests hit real DNS infrastructure and are intentionally opt-in.
 * Default repo validation keeps them disabled to preserve deterministic gates.
 *
 * Run with:
 * - `bun run test:live-dns`
 * - or `RUN_LIVE_DNS_TESTS=1 bun run --filter @dns-ops/collector test`
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { DNSResolver } from './resolver.js';
import type { VantageInfo } from './types.js';

interface LiveDnsFixtures {
  enabled: boolean;
  recursivePrimary: string;
  recursiveSecondary: string;
  positiveDomain: string;
  mailDomain: string;
  authoritativeDomain?: string;
  authoritativeNsIp?: string;
}

const LIVE_TEST_TIMEOUT_MS = 30_000;

function isTruthy(value: string | undefined): boolean {
  return value === '1' || value?.toLowerCase() === 'true';
}

function optionalEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

const LIVE_DNS: LiveDnsFixtures = {
  enabled: isTruthy(process.env.RUN_LIVE_DNS_TESTS),
  recursivePrimary: process.env.LIVE_DNS_RESOLVER_PRIMARY?.trim() || '8.8.8.8',
  recursiveSecondary: process.env.LIVE_DNS_RESOLVER_SECONDARY?.trim() || '1.1.1.1',
  positiveDomain: process.env.LIVE_DNS_DOMAIN?.trim() || 'cloudflare.com',
  mailDomain: process.env.LIVE_DNS_MAIL_DOMAIN?.trim() || 'google.com',
  authoritativeDomain: optionalEnv(process.env.LIVE_DNS_AUTHORITATIVE_DOMAIN),
  authoritativeNsIp: optionalEnv(process.env.LIVE_DNS_AUTHORITATIVE_NS_IP),
};

const PUBLIC_RECURSIVE: VantageInfo = {
  type: 'public-recursive',
  identifier: LIVE_DNS.recursivePrimary,
  region: 'global',
};

const SECONDARY_RECURSIVE: VantageInfo = {
  type: 'public-recursive',
  identifier: LIVE_DNS.recursiveSecondary,
  region: 'global',
};

const liveDescribe = LIVE_DNS.enabled ? describe.sequential : describe.skip;
const authoritativeDescribe =
  LIVE_DNS.authoritativeDomain && LIVE_DNS.authoritativeNsIp ? describe.sequential : describe.skip;

liveDescribe('DNS Integration Tests', () => {
  let resolver: DNSResolver;

  beforeAll(() => {
    resolver = new DNSResolver();
  });

  describe('Recursive resolver smoke', () => {
    it(
      'resolves A records through the primary recursive resolver',
      async () => {
        const result = await resolver.query(
          { name: LIVE_DNS.positiveDomain, type: 'A' },
          PUBLIC_RECURSIVE
        );

        expect(result.success).toBe(true);
        expect(result.answers.length).toBeGreaterThan(0);
        expect(result.answers[0]?.type).toBe('A');
        expect(result.answers[0]?.data).toMatch(/^\d{1,3}(\.\d{1,3}){3}$/);
        expect(result.responseTime).toBeGreaterThan(0);
      },
      LIVE_TEST_TIMEOUT_MS
    );

    it(
      'resolves A records through the secondary recursive resolver',
      async () => {
        const result = await resolver.query(
          { name: LIVE_DNS.positiveDomain, type: 'A' },
          SECONDARY_RECURSIVE
        );

        expect(result.success).toBe(true);
        expect(result.answers.length).toBeGreaterThan(0);
        expect(result.answers[0]?.type).toBe('A');
      },
      LIVE_TEST_TIMEOUT_MS
    );

    it(
      'returns NXDOMAIN for an RFC2606 non-existent name',
      async () => {
        const result = await resolver.query(
          { name: 'this-domain-does-not-exist.example', type: 'A' },
          PUBLIC_RECURSIVE
        );

        expect(result.success).toBe(false);
        expect(result.responseCode).toBe(3);
        expect(result.answers).toHaveLength(0);
      },
      LIVE_TEST_TIMEOUT_MS
    );

    it(
      'handles punycode domains without crashing',
      async () => {
        const result = await resolver.query(
          { name: 'xn--bcher-kva.ch', type: 'A' },
          PUBLIC_RECURSIVE
        );

        expect(result).toBeDefined();
        expect(result.query.name).toBe('xn--bcher-kva.ch');
        expect(result.responseTime).toBeGreaterThan(0);
      },
      LIVE_TEST_TIMEOUT_MS
    );
  });

  describe('Mail resolver smoke', () => {
    it(
      'resolves MX records for the configured mail domain',
      async () => {
        const result = await resolver.query(
          { name: LIVE_DNS.mailDomain, type: 'MX' },
          PUBLIC_RECURSIVE
        );

        expect(result.success).toBe(true);
        expect(result.answers.length).toBeGreaterThan(0);
        expect(result.answers[0]?.type).toBe('MX');
        expect(result.answers[0]?.data).toMatch(/^\d+\s+\S+/);
      },
      LIVE_TEST_TIMEOUT_MS
    );

    it(
      'resolves a DMARC TXT record for the configured mail domain',
      async () => {
        const result = await resolver.query(
          { name: `_dmarc.${LIVE_DNS.mailDomain}`, type: 'TXT' },
          PUBLIC_RECURSIVE
        );

        expect(result.success).toBe(true);
        expect(result.answers.length).toBeGreaterThan(0);
        expect(result.answers.some((answer) => answer.data.includes('v=DMARC1'))).toBe(true);
      },
      LIVE_TEST_TIMEOUT_MS
    );
  });

  authoritativeDescribe('Authoritative resolver smoke', () => {
    const domain = LIVE_DNS.authoritativeDomain as string;
    const nameserverIp = LIVE_DNS.authoritativeNsIp as string;

    it(
      'queries a configured authoritative nameserver directly',
      async () => {
        const authoritativeVantage: VantageInfo = {
          type: 'authoritative',
          identifier: nameserverIp,
        };

        const result = await resolver.query({ name: domain, type: 'NS' }, authoritativeVantage);

        expect(result.vantage.type).toBe('authoritative');
        expect(result.vantage.identifier).toBe(nameserverIp);
        expect(result.query.name).toBe(domain);
        expect(result.responseTime).toBeGreaterThan(0);
        expect(result.success).toBe(true);
        expect(result.answers.length).toBeGreaterThan(0);
        expect(result.answers[0]?.type).toBe('NS');
      },
      LIVE_TEST_TIMEOUT_MS
    );
  });
});

describe('DNS Collector Integration', () => {
  // These tests require the full collector, not just the resolver
  // They test the end-to-end collection flow

  it.todo('should collect complete snapshot for managed zone');
  it.todo('should collect targeted snapshot for unmanaged zone');
  it.todo('should handle partial failures gracefully');
  it.todo('should persist observations to database');
  it.todo('should consolidate observations into record sets');
  it.todo('should evaluate findings after collection');
});
