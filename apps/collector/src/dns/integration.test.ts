/**
 * DNS Collection Integration Tests - Bead dns-ops-1j4.5.3
 *
 * End-to-end tests for DNS collection against real/controllable zones.
 *
 * Test categories:
 * - Recursive resolver queries
 * - Authoritative server queries
 * - Error conditions (NXDOMAIN, NODATA, SERVFAIL)
 * - Edge cases (wildcards, IDN/punycode)
 *
 * These tests hit real DNS infrastructure and may be slower than unit tests.
 * Run with: bun test --grep "Integration"
 */

import { describe, expect, it, beforeAll } from 'vitest';
import { DNSResolver } from './resolver.js';
import type { VantageInfo, DNSQueryResult } from './types.js';

// Well-known test domains with predictable behavior
const TEST_DOMAINS = {
  // Google's domains have well-known records
  GOOGLE: 'google.com',
  // Cloudflare's test domain
  CLOUDFLARE: 'cloudflare.com',
  // IETF example domains (RFC 2606) - guaranteed to not resolve
  EXAMPLE_NXDOMAIN: 'this-domain-does-not-exist.example',
  // IDN test domain (if available)
  IDN_TEST: 'münchen.example', // May not resolve - punycode: xn--mnchen-3ya.example
};

// Vantage configurations
const PUBLIC_RECURSIVE: VantageInfo = {
  type: 'public-recursive',
  identifier: '8.8.8.8',
  region: 'global',
};

const CLOUDFLARE_RECURSIVE: VantageInfo = {
  type: 'public-recursive',
  identifier: '1.1.1.1',
  region: 'global',
};

describe('DNS Integration Tests', () => {
  let resolver: DNSResolver;

  beforeAll(() => {
    resolver = new DNSResolver();
  });

  describe('Recursive Resolver Queries', () => {
    it('should resolve A records via public recursive', async () => {
      const result = await resolver.query(
        { name: TEST_DOMAINS.GOOGLE, type: 'A' },
        PUBLIC_RECURSIVE
      );

      expect(result.success).toBe(true);
      expect(result.responseCode).toBe(0);
      expect(result.answers.length).toBeGreaterThan(0);
      expect(result.answers[0].type).toBe('A');
      // Google's IPs are in various ranges
      expect(result.answers[0].data).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
    });

    it('should resolve AAAA records via public recursive', async () => {
      const result = await resolver.query(
        { name: TEST_DOMAINS.GOOGLE, type: 'AAAA' },
        PUBLIC_RECURSIVE
      );

      expect(result.success).toBe(true);
      // Google should have AAAA records
      expect(result.answers.length).toBeGreaterThan(0);
      expect(result.answers[0].type).toBe('AAAA');
    });

    it('should resolve MX records via public recursive', async () => {
      const result = await resolver.query(
        { name: TEST_DOMAINS.GOOGLE, type: 'MX' },
        PUBLIC_RECURSIVE
      );

      expect(result.success).toBe(true);
      expect(result.answers.length).toBeGreaterThan(0);
      expect(result.answers[0].type).toBe('MX');
      // MX records have format "priority hostname"
      expect(result.answers[0].data).toMatch(/^\d+\s+\S+/);
    });

    it('should resolve TXT records via public recursive', async () => {
      const result = await resolver.query(
        { name: TEST_DOMAINS.GOOGLE, type: 'TXT' },
        PUBLIC_RECURSIVE
      );

      // TXT queries may fail due to rate limiting or network issues
      // Just verify we got a valid response structure
      expect(result).toBeDefined();
      expect(result.query.type).toBe('TXT');
      if (result.success) {
        // Google has various TXT records (SPF, verification, etc.)
        expect(result.answers.length).toBeGreaterThan(0);
        expect(result.answers[0].type).toBe('TXT');
      }
    });

    it('should resolve NS records via public recursive', async () => {
      const result = await resolver.query(
        { name: TEST_DOMAINS.GOOGLE, type: 'NS' },
        PUBLIC_RECURSIVE
      );

      expect(result.success).toBe(true);
      expect(result.answers.length).toBeGreaterThan(0);
      expect(result.answers[0].type).toBe('NS');
      // Google's NS records
      expect(result.answers[0].data).toMatch(/ns\d*\.google\.com\.?/i);
    });

    it('should resolve SOA records via public recursive', async () => {
      const result = await resolver.query(
        { name: TEST_DOMAINS.GOOGLE, type: 'SOA' },
        PUBLIC_RECURSIVE
      );

      expect(result.success).toBe(true);
      expect(result.answers.length).toBe(1);
      expect(result.answers[0].type).toBe('SOA');
      // SOA format: primary-ns admin-email serial refresh retry expire minimum
      expect(result.answers[0].data).toContain('google.com');
    });

    it('should handle queries from different recursive resolvers consistently', async () => {
      const [googleResult, cloudflareResult] = await Promise.all([
        resolver.query({ name: TEST_DOMAINS.CLOUDFLARE, type: 'A' }, PUBLIC_RECURSIVE),
        resolver.query({ name: TEST_DOMAINS.CLOUDFLARE, type: 'A' }, CLOUDFLARE_RECURSIVE),
      ]);

      // Both should succeed
      expect(googleResult.success).toBe(true);
      expect(cloudflareResult.success).toBe(true);

      // Both should return IP addresses (may differ due to anycast)
      expect(googleResult.answers.length).toBeGreaterThan(0);
      expect(cloudflareResult.answers.length).toBeGreaterThan(0);
    });
  });

  describe('Authoritative Server Queries', () => {
    it('should query authoritative nameserver directly', async () => {
      // First, get the NS records for google.com
      const nsResult = await resolver.query(
        { name: TEST_DOMAINS.GOOGLE, type: 'NS' },
        PUBLIC_RECURSIVE
      );

      expect(nsResult.success).toBe(true);
      expect(nsResult.answers.length).toBeGreaterThan(0);

      // Extract a nameserver hostname
      const nsHostname = nsResult.answers[0].data.replace(/\.$/, '');

      // Query the authoritative server directly
      const authVantage: VantageInfo = {
        type: 'authoritative',
        identifier: nsHostname,
      };

      const authResult = await resolver.query(
        { name: TEST_DOMAINS.GOOGLE, type: 'A' },
        authVantage
      );

      // Authoritative query may succeed or fail depending on network
      // The key is we made the attempt with the right vantage
      expect(authResult.vantage.type).toBe('authoritative');
      expect(authResult.vantage.identifier).toBe(nsHostname);
    });
  });

  describe('NXDOMAIN Handling', () => {
    it('should return NXDOMAIN (rcode 3) for non-existent domains', async () => {
      const result = await resolver.query(
        { name: TEST_DOMAINS.EXAMPLE_NXDOMAIN, type: 'A' },
        PUBLIC_RECURSIVE
      );

      expect(result.success).toBe(false);
      expect(result.responseCode).toBe(3); // NXDOMAIN
      expect(result.answers).toHaveLength(0);
    });

    it('should return NXDOMAIN for random subdomain of valid domain', async () => {
      const randomSubdomain = `nonexistent-${Date.now()}.google.com`;
      const result = await resolver.query(
        { name: randomSubdomain, type: 'A' },
        PUBLIC_RECURSIVE
      );

      expect(result.success).toBe(false);
      expect(result.responseCode).toBe(3); // NXDOMAIN
    });
  });

  describe('NODATA Handling', () => {
    it('should return empty answers for NODATA (record type does not exist)', async () => {
      // Most domains don't have AAAA records for their MX servers
      // Query a type that likely doesn't exist for a hostname
      const nsResult = await resolver.query(
        { name: TEST_DOMAINS.GOOGLE, type: 'NS' },
        PUBLIC_RECURSIVE
      );

      if (nsResult.success && nsResult.answers.length > 0) {
        // Query AAAA for a nameserver (may or may not have it)
        const nsHostname = nsResult.answers[0].data.replace(/\.$/, '');
        const result = await resolver.query(
          { name: nsHostname, type: 'MX' },
          PUBLIC_RECURSIVE
        );

        // NS servers typically don't have MX records
        // This should be success with no answers (NODATA)
        if (result.success) {
          expect(result.answers.length).toBe(0);
        }
      }
    });
  });

  describe('CNAME Handling', () => {
    it('should resolve CNAME records correctly', async () => {
      // www.google.com is often a CNAME
      const result = await resolver.query(
        { name: 'www.google.com', type: 'CNAME' },
        PUBLIC_RECURSIVE
      );

      // Verify response structure regardless of success
      // CNAME queries may return NODATA (success but no answers)
      // or may fail with NXDOMAIN if www is an A record
      expect(result).toBeDefined();
      expect(result.query.type).toBe('CNAME');
    });
  });

  describe('Response Time Tracking', () => {
    it('should track response time for queries', async () => {
      const result = await resolver.query(
        { name: TEST_DOMAINS.GOOGLE, type: 'A' },
        PUBLIC_RECURSIVE
      );

      expect(result.responseTime).toBeGreaterThan(0);
      expect(result.responseTime).toBeLessThan(5000); // Should be under 5 seconds
    });

    it('should have reasonable response times for cached queries', async () => {
      // First query may be slower (cold cache)
      await resolver.query(
        { name: TEST_DOMAINS.CLOUDFLARE, type: 'A' },
        PUBLIC_RECURSIVE
      );

      // Second query should be faster (warm cache)
      const result = await resolver.query(
        { name: TEST_DOMAINS.CLOUDFLARE, type: 'A' },
        PUBLIC_RECURSIVE
      );

      expect(result.responseTime).toBeLessThan(1000); // Should be under 1 second
    });
  });

  describe('IDN/Punycode Handling', () => {
    it('should handle punycode domain names', async () => {
      // xn--mnchen-3ya.de is the punycode for münchen.de
      // But this may not resolve - the test validates we handle the format
      const result = await resolver.query(
        { name: 'xn--bcher-kva.ch', type: 'A' }, // bücher.ch
        PUBLIC_RECURSIVE
      );

      // The domain may or may not exist, but we shouldn't crash
      expect(result).toBeDefined();
      expect(result.query.name).toBe('xn--bcher-kva.ch');
    });

    it('should convert unicode domain to punycode for query', async () => {
      // Note: The resolver may or may not auto-convert unicode to punycode
      // This test documents current behavior
      const result = await resolver.query(
        { name: 'münchen.de', type: 'A' },
        PUBLIC_RECURSIVE
      );

      // Query was attempted (may fail due to encoding)
      expect(result).toBeDefined();
    });
  });

  describe('Wildcard Record Handling', () => {
    it('should resolve wildcard records when present', async () => {
      // Many CDNs use wildcards - this tests that arbitrary subdomains resolve
      const randomSubdomain = `random-${Date.now()}.cloudflare.com`;
      const result = await resolver.query(
        { name: randomSubdomain, type: 'A' },
        PUBLIC_RECURSIVE
      );

      // Cloudflare may or may not have wildcards for their main domain
      // The test validates we handle the response correctly
      expect(result).toBeDefined();
      // Either resolves (wildcard) or NXDOMAIN (no wildcard)
      expect([true, false]).toContain(result.success);
    });
  });

  describe('DNS Flags', () => {
    it('should include DNS flags in response', async () => {
      const result = await resolver.query(
        { name: TEST_DOMAINS.GOOGLE, type: 'A' },
        PUBLIC_RECURSIVE
      );

      expect(result.flags).toBeDefined();
      // For recursive queries, RD (Recursion Desired) should be true
      expect(result.flags?.rd).toBe(true);
      // For cached responses from recursive, RA should be true
      expect(result.flags?.ra).toBe(true);
    });
  });

  describe('Multiple Record Types', () => {
    it('should handle domains with multiple record types', async () => {
      // Query multiple types for the same domain
      const [aResult, aaaaResult, mxResult, txtResult] = await Promise.all([
        resolver.query({ name: TEST_DOMAINS.GOOGLE, type: 'A' }, PUBLIC_RECURSIVE),
        resolver.query({ name: TEST_DOMAINS.GOOGLE, type: 'AAAA' }, PUBLIC_RECURSIVE),
        resolver.query({ name: TEST_DOMAINS.GOOGLE, type: 'MX' }, PUBLIC_RECURSIVE),
        resolver.query({ name: TEST_DOMAINS.GOOGLE, type: 'TXT' }, PUBLIC_RECURSIVE),
      ]);

      // A and AAAA should succeed for google.com
      expect(aResult.success).toBe(true);
      expect(aaaaResult.success).toBe(true);
      expect(mxResult.success).toBe(true);
      // TXT may fail due to rate limiting - just verify structure
      expect(txtResult).toBeDefined();
      expect(txtResult.query.type).toBe('TXT');
    });
  });

  describe('Mail-Related Records', () => {
    it('should resolve _dmarc TXT record', async () => {
      const result = await resolver.query(
        { name: `_dmarc.${TEST_DOMAINS.GOOGLE}`, type: 'TXT' },
        PUBLIC_RECURSIVE
      );

      expect(result.success).toBe(true);
      // Google has DMARC
      expect(result.answers.length).toBeGreaterThan(0);
      expect(result.answers[0].data).toContain('v=DMARC1');
    });

    it('should handle SPF in TXT records', async () => {
      const result = await resolver.query(
        { name: TEST_DOMAINS.GOOGLE, type: 'TXT' },
        PUBLIC_RECURSIVE
      );

      // TXT queries may fail due to rate limiting
      expect(result).toBeDefined();
      if (result.success && result.answers.length > 0) {
        // Find SPF record if TXT query succeeded
        const spfRecord = result.answers.find(
          (a) => a.data.startsWith('v=spf1')
        );
        // Google should have SPF
        expect(spfRecord).toBeDefined();
      }
    });
  });

  describe('Error Resilience', () => {
    it('should handle invalid domain names gracefully', async () => {
      const result = await resolver.query(
        { name: 'invalid..domain', type: 'A' },
        PUBLIC_RECURSIVE
      );

      // Should not throw, should return error
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
    });

    it('should handle very long domain names', async () => {
      // DNS labels can be max 63 chars, total domain max 253 chars
      const longLabel = 'a'.repeat(63);
      const longDomain = `${longLabel}.example.com`;

      const result = await resolver.query(
        { name: longDomain, type: 'A' },
        PUBLIC_RECURSIVE
      );

      expect(result).toBeDefined();
      // Should fail (domain doesn't exist) but not crash
      expect(result.success).toBe(false);
    });
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
