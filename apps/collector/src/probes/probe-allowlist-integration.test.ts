/**
 * Probe Allowlist Integration Tests - PR-06.3
 *
 * Tests for allowlist integration scenarios:
 * - non-allowlisted domain rejected with 403
 * - MX-derived allowlisted domain accepted
 * - Domain with no MX records → empty allowlist, all probes rejected
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DNSQueryResult } from '../dns/types.js';
import { ProbeAllowlist } from './allowlist.js';

// =============================================================================
// Test Setup
// =============================================================================

describe('PR-06.3: Allowlist Integration Tests', () => {
  let allowlist: ProbeAllowlist;

  beforeEach(() => {
    allowlist = new ProbeAllowlist(30000); // 30 second TTL
  });

  afterEach(() => {
    allowlist.clear();
  });

  // =============================================================================
  // Non-allowlisted domain rejection
  // =============================================================================

  describe('Non-allowlisted domain rejection', () => {
    it('should reject probe to arbitrary domain not in allowlist', () => {
      // Domain never added to allowlist
      const result = allowlist.isAllowed('evil-actor.com', 25);
      expect(result).toBe(false);
    });

    it('should reject probe to unconfigured third-party domain', () => {
      const domains = [
        'external-service.example.net',
        'unknown-host.example.org',
        'random-internal.corp',
      ];

      for (const domain of domains) {
        expect(allowlist.isAllowed(domain, 25)).toBe(false);
      }
    });

    it('should reject SSRF targets even with allowlist configured', () => {
      // Even if allowlist has some entries, internal/private IPs should be rejected
      // SSRF guard handles this, but allowlist should also block
      expect(allowlist.isAllowed('localhost', 25)).toBe(false);
      expect(allowlist.isAllowed('127.0.0.1', 25)).toBe(false);
      expect(allowlist.isAllowed('192.168.1.1', 25)).toBe(false);
    });
  });

  // =============================================================================
  // MX-derived allowlisted domain acceptance
  // =============================================================================

  describe('MX-derived allowlisted domain acceptance', () => {
    it('should accept probe when MX-derived allowlist entry exists', () => {
      const dnsResults: DNSQueryResult[] = [
        {
          query: { name: 'example.com', type: 'MX' },
          vantage: { type: 'public-recursive', identifier: 'google-dns' },
          success: true,
          answers: [
            { name: 'example.com', type: 'MX', ttl: 300, data: '10 mail1.google.com.' },
            { name: 'example.com', type: 'MX', ttl: 300, data: '20 mail2.google.com.' },
          ],
          authority: [],
          additional: [],
          responseTime: 50,
        },
      ];

      const entries = allowlist.generateFromDnsResults('example.com', dnsResults);

      // Should have entries for both mail servers
      expect(entries.length).toBeGreaterThan(0);

      // Both should be allowed (trailing dots stripped)
      expect(allowlist.isAllowed('mail1.google.com', 25)).toBe(true);
      expect(allowlist.isAllowed('mail2.google.com', 25)).toBe(true);
    });

    it('should accept probe when MX record points to subdomain', () => {
      const dnsResults: DNSQueryResult[] = [
        {
          query: { name: 'custom-domain.com', type: 'MX' },
          vantage: { type: 'public-recursive', identifier: 'google-dns' },
          success: true,
          answers: [
            {
              name: 'custom-domain.com',
              type: 'MX',
              ttl: 300,
              data: '10 em2347.x.domain.example.net.',
            },
          ],
          authority: [],
          additional: [],
          responseTime: 50,
        },
      ];

      const entries = allowlist.generateFromDnsResults('custom-domain.com', dnsResults);

      expect(entries.length).toBe(1);
      // Trailing dot stripped from hostname
      expect(entries[0].hostname).toBe('em2347.x.domain.example.net');
      expect(allowlist.isAllowed('em2347.x.domain.example.net', 25)).toBe(true);
    });

    it('should track MX derivation for audit purposes', () => {
      const dnsResults: DNSQueryResult[] = [
        {
          query: { name: 'company.com', type: 'MX' },
          vantage: { type: 'public-recursive', identifier: 'cloudflare-dns' },
          success: true,
          answers: [
            { name: 'company.com', type: 'MX', ttl: 300, data: '10 mx1.office365client.com.' },
          ],
          authority: [],
          additional: [],
          responseTime: 50,
        },
      ];

      allowlist.generateFromDnsResults('company.com', dnsResults);

      const entry = allowlist.getEntry('mx1.office365client.com', 25);
      expect(entry).toBeDefined();
      expect(entry?.derivedFrom.domain).toBe('company.com');
      expect(entry?.derivedFrom.queryType).toBe('MX');
      expect(entry?.derivedFrom.answerData).toContain('office365client.com');
    });

    it('should accept MTA-STS probe target', () => {
      // MTA-STS is probed via HTTPS to mta-sts.{domain}
      allowlist.addCustomEntry('mta-sts.example.com', 443, 'manual', 'MTA-STS probe target');

      expect(allowlist.isAllowed('mta-sts.example.com', 443)).toBe(true);
    });
  });

  // =============================================================================
  // Domain with no MX records
  // =============================================================================

  describe('Domain with no MX records', () => {
    it('should result in empty allowlist when no MX records found', () => {
      // Empty DNS results
      const dnsResults: DNSQueryResult[] = [];

      const entries = allowlist.generateFromDnsResults('no-mx-domain.com', dnsResults);

      expect(entries.length).toBe(0);
    });

    it('should reject all probes when MX query returns nodata', () => {
      // DNS NODATA response (query succeeded but no MX records)
      const dnsResults: DNSQueryResult[] = [
        {
          query: { name: 'no-mx-domain.com', type: 'MX' },
          vantage: { type: 'public-recursive', identifier: 'google-dns' },
          success: true, // Query succeeded
          answers: [], // But no MX records
          authority: [],
          additional: [],
          responseTime: 50,
        },
      ];

      const entries = allowlist.generateFromDnsResults('no-mx-domain.com', dnsResults);

      expect(entries.length).toBe(0);
      expect(allowlist.isAllowed('anything.example.com', 25)).toBe(false);
    });

    it('should reject probes when DNS query fails for MX', () => {
      // DNS query failure
      const dnsResults: DNSQueryResult[] = [
        {
          query: { name: 'failing-domain.com', type: 'MX' },
          vantage: { type: 'public-recursive', identifier: 'google-dns' },
          success: false, // Query failed
          answers: [],
          authority: [],
          additional: [],
          responseTime: 5000,
          error: 'Query timeout',
        },
      ];

      const entries = allowlist.generateFromDnsResults('failing-domain.com', dnsResults);

      expect(entries.length).toBe(0);
      expect(allowlist.isAllowed('mail.failing-domain.com', 25)).toBe(false);
    });

    it('should propagate NXDOMAIN for MX query to empty allowlist', () => {
      // NXDOMAIN response
      const dnsResults: DNSQueryResult[] = [
        {
          query: { name: 'nonexistent-domain.xyz', type: 'MX' },
          vantage: { type: 'public-recursive', identifier: 'google-dns' },
          success: true, // Query itself succeeded
          answers: [], // But no records
          authority: [],
          additional: [],
          responseTime: 50,
        },
      ];

      const entries = allowlist.generateFromDnsResults('nonexistent-domain.xyz', dnsResults);

      expect(entries.length).toBe(0);
      expect(allowlist.isAllowed('anything-nonexistent.xyz', 25)).toBe(false);
    });
  });

  // =============================================================================
  // Allowlist derivation strategy
  // =============================================================================

  describe('Allowlist derivation strategy', () => {
    it('should derive entries only from MX records', () => {
      const dnsResults: DNSQueryResult[] = [
        // MX record
        {
          query: { name: 'company.com', type: 'MX' },
          vantage: { type: 'public-recursive', identifier: 'google-dns' },
          success: true,
          answers: [{ name: 'company.com', type: 'MX', ttl: 300, data: '10 mx.company.com.' }],
          authority: [],
          additional: [],
          responseTime: 50,
        },
        // TXT record (SPF) - not a mail destination
        {
          query: { name: 'company.com', type: 'TXT' },
          vantage: { type: 'public-recursive', identifier: 'google-dns' },
          success: true,
          answers: [
            {
              name: 'company.com',
              type: 'TXT',
              ttl: 300,
              data: 'v=spf1 include:_spf.google.com ~all',
            },
          ],
          authority: [],
          additional: [],
          responseTime: 50,
        },
      ];

      const entries = allowlist.generateFromDnsResults('company.com', dnsResults);

      // Only MX-derived entries (trailing dot stripped from hostname)
      expect(entries.length).toBe(1);
      expect(entries[0].hostname).toBe('mx.company.com');
      expect(entries[0].derivedFrom.queryType).toBe('MX');
    });

    it('should only allow probing hosts explicitly in allowlist', () => {
      const dnsResults: DNSQueryResult[] = [
        {
          query: { name: 'safe-domain.com', type: 'MX' },
          vantage: { type: 'public-recursive', identifier: 'google-dns' },
          success: true,
          answers: [{ name: 'safe-domain.com', type: 'MX', ttl: 300, data: '10 safe-mail.com.' }],
          authority: [],
          additional: [],
          responseTime: 50,
        },
      ];

      const entries = allowlist.generateFromDnsResults('safe-domain.com', dnsResults);

      expect(entries.length).toBe(1);
      // Trailing dot is stripped from hostname
      expect(entries[0].hostname).toBe('safe-mail.com');

      // Verify entry is allowed
      expect(allowlist.isAllowed('safe-mail.com', 25)).toBe(true);

      // Unsafe target - not allowed (no allowlist entry)
      expect(allowlist.isAllowed('unsafe-target.attacker.com', 25)).toBe(false);
    });
  });

  // =============================================================================
  // Egress identity
  // =============================================================================

  describe('Egress identity verification', () => {
    it('should have entries with correct derivation info', () => {
      const dnsResults: DNSQueryResult[] = [
        {
          query: { name: 'test.com', type: 'MX' },
          vantage: { type: 'public-recursive', identifier: 'google-dns' },
          success: true,
          answers: [
            { name: 'test.com', type: 'MX', ttl: 300, data: '10 mx.test.com.' },
            { name: 'test.com', type: 'MX', ttl: 300, data: '20 backup-mx.test.com.' },
          ],
          authority: [],
          additional: [],
          responseTime: 50,
        },
      ];

      const entries = allowlist.generateFromDnsResults('test.com', dnsResults);

      expect(entries.length).toBe(2);

      for (const entry of entries) {
        expect(entry.derivedFrom.domain).toBe('test.com');
        expect(entry.derivedFrom.queryType).toBe('MX');
        expect(entry.hostname).toBeDefined();
      }
    });

    it('should reject when no derivation exists', () => {
      // Empty allowlist
      expect(allowlist.isAllowed('random-host.com', 25)).toBe(false);
    });
  });
});
