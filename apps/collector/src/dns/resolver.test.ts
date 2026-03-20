/**
 * DNS Resolver Tests
 *
 * Tests for:
 * - Record type support (A, AAAA, CNAME, MX, TXT, NS, SOA, CAA)
 * - Error handling and response code mapping
 * - Vantage configuration (recursive vs authoritative)
 * - Response structure validation
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the dns/promises module
const mockResolve4 = vi.fn();
const mockResolve6 = vi.fn();
const mockResolveMx = vi.fn();
const mockResolveTxt = vi.fn();
const mockResolveNs = vi.fn();
const mockResolveCname = vi.fn();
const mockResolveSoa = vi.fn();
const mockResolveAny = vi.fn();
const mockSetServers = vi.fn();

vi.mock('node:dns/promises', () => ({
  Resolver: class {
    resolve4 = mockResolve4;
    resolve6 = mockResolve6;
    resolveMx = mockResolveMx;
    resolveTxt = mockResolveTxt;
    resolveNs = mockResolveNs;
    resolveCname = mockResolveCname;
    resolveSoa = mockResolveSoa;
    resolveAny = mockResolveAny;
    setServers = mockSetServers;
  },
}));

import { DNSResolver } from './resolver.js';
import type { VantageInfo } from './types.js';

describe('DNSResolver', () => {
  let resolver: DNSResolver;
  const recursiveVantage: VantageInfo = {
    type: 'public-recursive',
    identifier: '8.8.8.8',
  };
  const authoritativeVantage: VantageInfo = {
    type: 'authoritative',
    identifier: 'ns1.example.com',
  };

  beforeEach(() => {
    resolver = new DNSResolver();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Vantage Configuration', () => {
    it('should set servers for public-recursive vantage', async () => {
      mockResolve4.mockResolvedValue(['192.0.2.1']);

      await resolver.query({ name: 'example.com', type: 'A' }, recursiveVantage);

      expect(mockSetServers).toHaveBeenCalledWith(['8.8.8.8']);
    });

    it('should set servers for authoritative vantage', async () => {
      mockResolve4.mockResolvedValue(['192.0.2.1']);

      await resolver.query({ name: 'example.com', type: 'A' }, authoritativeVantage);

      expect(mockSetServers).toHaveBeenCalledWith(['ns1.example.com']);
    });
  });

  describe('A Record Queries', () => {
    it('should query A records successfully', async () => {
      mockResolve4.mockResolvedValue(['192.0.2.1', '192.0.2.2']);

      const result = await resolver.query({ name: 'example.com', type: 'A' }, recursiveVantage);

      expect(result.success).toBe(true);
      expect(result.responseCode).toBe(0);
      expect(result.answers).toHaveLength(2);
      expect(result.answers[0]).toMatchObject({
        name: 'example.com',
        type: 'A',
        data: '192.0.2.1',
      });
    });

    it('should return default TTL of 300 for A records', async () => {
      mockResolve4.mockResolvedValue(['192.0.2.1']);

      const result = await resolver.query({ name: 'example.com', type: 'A' }, recursiveVantage);

      expect(result.answers[0].ttl).toBe(300);
    });
  });

  describe('AAAA Record Queries', () => {
    it('should query AAAA records successfully', async () => {
      mockResolve6.mockResolvedValue(['2001:db8::1', '2001:db8::2']);

      const result = await resolver.query({ name: 'example.com', type: 'AAAA' }, recursiveVantage);

      expect(result.success).toBe(true);
      expect(result.answers).toHaveLength(2);
      expect(result.answers[0]).toMatchObject({
        name: 'example.com',
        type: 'AAAA',
        data: '2001:db8::1',
      });
    });
  });

  describe('MX Record Queries', () => {
    it('should query MX records with priority', async () => {
      mockResolveMx.mockResolvedValue([
        { priority: 10, exchange: 'mail.example.com' },
        { priority: 20, exchange: 'backup.example.com' },
      ]);

      const result = await resolver.query({ name: 'example.com', type: 'MX' }, recursiveVantage);

      expect(result.success).toBe(true);
      expect(result.answers).toHaveLength(2);
      expect(result.answers[0]).toMatchObject({
        type: 'MX',
        data: '10 mail.example.com',
      });
      expect(result.answers[1]).toMatchObject({
        type: 'MX',
        data: '20 backup.example.com',
      });
    });
  });

  describe('TXT Record Queries', () => {
    it('should query TXT records and join multi-string values', async () => {
      mockResolveTxt.mockResolvedValue([
        ['v=spf1 include:_spf.google.com ~all'],
        ['v=DMARC1; p=reject'],
      ]);

      const result = await resolver.query({ name: 'example.com', type: 'TXT' }, recursiveVantage);

      expect(result.success).toBe(true);
      expect(result.answers).toHaveLength(2);
      expect(result.answers[0].data).toBe('v=spf1 include:_spf.google.com ~all');
    });

    it('should join multi-chunk TXT records', async () => {
      // Long TXT records are returned as arrays of strings
      mockResolveTxt.mockResolvedValue([['chunk1', 'chunk2', 'chunk3']]);

      const result = await resolver.query({ name: 'example.com', type: 'TXT' }, recursiveVantage);

      expect(result.answers[0].data).toBe('chunk1chunk2chunk3');
    });
  });

  describe('NS Record Queries', () => {
    it('should query NS records successfully', async () => {
      mockResolveNs.mockResolvedValue(['ns1.example.com', 'ns2.example.com']);

      const result = await resolver.query({ name: 'example.com', type: 'NS' }, recursiveVantage);

      expect(result.success).toBe(true);
      expect(result.answers).toHaveLength(2);
      expect(result.answers[0]).toMatchObject({
        type: 'NS',
        data: 'ns1.example.com',
      });
    });
  });

  describe('CNAME Record Queries', () => {
    it('should query CNAME records successfully', async () => {
      mockResolveCname.mockResolvedValue(['www.example.com']);

      const result = await resolver.query(
        { name: 'alias.example.com', type: 'CNAME' },
        recursiveVantage
      );

      expect(result.success).toBe(true);
      expect(result.answers[0]).toMatchObject({
        name: 'alias.example.com',
        type: 'CNAME',
        data: 'www.example.com',
      });
    });
  });

  describe('SOA Record Queries', () => {
    it('should query SOA records and format properly', async () => {
      mockResolveSoa.mockResolvedValue({
        nsname: 'ns1.example.com',
        hostmaster: 'admin.example.com',
        serial: 2024010101,
        refresh: 3600,
        retry: 900,
        expire: 604800,
        minttl: 86400,
      });

      const result = await resolver.query({ name: 'example.com', type: 'SOA' }, recursiveVantage);

      expect(result.success).toBe(true);
      expect(result.answers).toHaveLength(1);
      expect(result.answers[0].data).toBe(
        'ns1.example.com admin.example.com 2024010101 3600 900 604800 86400'
      );
      expect(result.answers[0].ttl).toBe(86400); // Uses minttl
    });

    it('should handle SOA with minimumTTL instead of minttl', async () => {
      mockResolveSoa.mockResolvedValue({
        nsname: 'ns1.example.com',
        hostmaster: 'admin.example.com',
        serial: 2024010101,
        refresh: 3600,
        retry: 900,
        expire: 604800,
        minimumTTL: 43200,
      });

      const result = await resolver.query({ name: 'example.com', type: 'SOA' }, recursiveVantage);

      expect(result.answers[0].ttl).toBe(43200);
    });
  });

  describe('CAA Record Queries', () => {
    it('should query CAA records via resolveAny', async () => {
      mockResolveAny.mockResolvedValue([
        { type: 'A', address: '192.0.2.1' }, // Non-CAA record
        { type: 'CAA', critical: 0, issue: 'issue', value: 'letsencrypt.org' },
        { type: 'CAA', critical: 128, issue: 'issuewild', value: 'example.com' },
      ]);

      const result = await resolver.query({ name: 'example.com', type: 'CAA' }, recursiveVantage);

      expect(result.success).toBe(true);
      expect(result.answers).toHaveLength(2);
      expect(result.answers[0].data).toContain('letsencrypt.org');
    });

    it('should return empty answers when no CAA records exist', async () => {
      mockResolveAny.mockResolvedValue([{ type: 'A', address: '192.0.2.1' }]);

      const result = await resolver.query({ name: 'example.com', type: 'CAA' }, recursiveVantage);

      expect(result.success).toBe(true);
      expect(result.answers).toHaveLength(0);
    });

    it('should handle CAA query errors gracefully', async () => {
      mockResolveAny.mockRejectedValue(new Error('Query failed'));

      const result = await resolver.query({ name: 'example.com', type: 'CAA' }, recursiveVantage);

      // CAA errors return empty answers, not failure
      expect(result.success).toBe(true);
      expect(result.answers).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle ENOTFOUND as NXDOMAIN', async () => {
      mockResolve4.mockRejectedValue(new Error('getaddrinfo ENOTFOUND example.com'));

      const result = await resolver.query({ name: 'example.com', type: 'A' }, recursiveVantage);

      expect(result.success).toBe(false);
      expect(result.responseCode).toBe(3); // NXDOMAIN
      expect(result.error).toContain('ENOTFOUND');
    });

    it('should handle ECONNREFUSED as REFUSED', async () => {
      mockResolve4.mockRejectedValue(new Error('connect ECONNREFUSED 8.8.8.8'));

      const result = await resolver.query({ name: 'example.com', type: 'A' }, recursiveVantage);

      expect(result.success).toBe(false);
      expect(result.responseCode).toBe(5); // REFUSED
    });

    it('should handle timeout errors as SERVFAIL', async () => {
      mockResolve4.mockRejectedValue(new Error('DNS query timeout'));

      const result = await resolver.query({ name: 'example.com', type: 'A' }, recursiveVantage);

      expect(result.success).toBe(false);
      expect(result.responseCode).toBe(2); // SERVFAIL
    });

    it('should handle unknown errors as SERVFAIL', async () => {
      mockResolve4.mockRejectedValue(new Error('Unknown error'));

      const result = await resolver.query({ name: 'example.com', type: 'A' }, recursiveVantage);

      expect(result.success).toBe(false);
      expect(result.responseCode).toBe(2); // SERVFAIL
      expect(result.error).toBe('Unknown error');
    });

    it('should return error for unsupported record types', async () => {
      const result = await resolver.query(
        { name: 'example.com', type: 'UNSUPPORTED' },
        recursiveVantage
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unsupported record type: UNSUPPORTED');
      expect(result.responseCode).toBe(2); // SERVFAIL
    });
  });

  describe('Response Structure', () => {
    it('should include query and vantage info in response', async () => {
      mockResolve4.mockResolvedValue(['192.0.2.1']);

      const result = await resolver.query({ name: 'example.com', type: 'A' }, recursiveVantage);

      expect(result.query).toEqual({ name: 'example.com', type: 'A' });
      expect(result.vantage).toEqual(recursiveVantage);
    });

    it('should include DNS flags in successful response', async () => {
      mockResolve4.mockResolvedValue(['192.0.2.1']);

      const result = await resolver.query({ name: 'example.com', type: 'A' }, recursiveVantage);

      expect(result.flags).toMatchObject({
        aa: false,
        tc: false,
        rd: true,
        ra: true,
        ad: false,
        cd: false,
      });
    });

    it('should include empty authority and additional sections', async () => {
      mockResolve4.mockResolvedValue(['192.0.2.1']);

      const result = await resolver.query({ name: 'example.com', type: 'A' }, recursiveVantage);

      expect(result.authority).toEqual([]);
      expect(result.additional).toEqual([]);
    });

    it('should include response time', async () => {
      mockResolve4.mockResolvedValue(['192.0.2.1']);

      const result = await resolver.query({ name: 'example.com', type: 'A' }, recursiveVantage);

      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });
  });
});
