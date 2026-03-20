/**
 * Delegation Collection Tests - TDD/BDD
 *
 * Tests for delegation vantage collection:
 * - Parent zone delegation view
 * - Per-authoritative-server answers
 * - Glue record capture
 * - DNSSEC observation fields
 * - Lame delegation detection
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DNSAnswer } from '../dns/types';
import { DelegationCollector } from './collector';

// Mock DNSResolver
const mockQuery = vi.fn();
vi.mock('../dns/resolver', () => ({
  DNSResolver: vi.fn().mockImplementation(() => ({
    query: mockQuery,
  })),
}));

describe('DelegationCollector', () => {
  beforeEach(() => {
    mockQuery.mockClear();
  });

  describe('Parent Zone Delegation View', () => {
    it('should query parent zone for NS records', async () => {
      const collector = new DelegationCollector('example.com');

      mockQuery.mockResolvedValueOnce({
        query: { name: 'example.com', type: 'NS' },
        success: true,
        answers: [
          { name: 'example.com', type: 'NS', ttl: 86400, data: 'ns1.example.com' },
          { name: 'example.com', type: 'NS', ttl: 86400, data: 'ns2.example.com' },
        ],
      });

      const result = await collector.collectParentDelegation('8.8.8.8');

      expect(mockQuery).toHaveBeenCalledWith(
        { name: 'example.com', type: 'NS' },
        { type: 'public-recursive', identifier: '8.8.8.8', region: 'us-central' }
      );
      expect(result.answers).toHaveLength(2);
    });

    it('should extract parent zone from domain', () => {
      const collector = new DelegationCollector('sub.example.com');

      expect(collector.getParentZone('sub.example.com')).toBe('example.com');
      expect(collector.getParentZone('example.com')).toBe('com');
      expect(collector.getParentZone('deep.sub.example.com')).toBe('sub.example.com');
    });
  });

  describe('Per-Authoritative-Server Collection', () => {
    it('should query each NS server individually', async () => {
      const collector = new DelegationCollector('example.com');
      const nsServers = ['ns1.example.com', 'ns2.example.com'];

      // Mock responses from each authoritative server
      mockQuery
        .mockResolvedValueOnce({
          query: { name: 'example.com', type: 'A' },
          success: true,
          answers: [{ name: 'example.com', type: 'A', ttl: 300, data: '192.0.2.1' }],
        })
        .mockResolvedValueOnce({
          query: { name: 'example.com', type: 'A' },
          success: true,
          answers: [{ name: 'example.com', type: 'A', ttl: 300, data: '192.0.2.2' }],
        });

      const results = await collector.collectFromAuthoritativeServers(
        { name: 'example.com', type: 'A' },
        nsServers
      );

      expect(results).toHaveLength(2);
      expect(results[0].vantage.identifier).toBe('ns1.example.com');
      expect(results[1].vantage.identifier).toBe('ns2.example.com');
    });

    it('should detect divergent answers across authoritative servers', async () => {
      const collector = new DelegationCollector('example.com');
      const nsServers = ['ns1.example.com', 'ns2.example.com'];

      // Different answers = divergence
      mockQuery
        .mockResolvedValueOnce({
          query: { name: 'example.com', type: 'A' },
          success: true,
          answers: [{ name: 'example.com', type: 'A', ttl: 300, data: '192.0.2.1' }],
        })
        .mockResolvedValueOnce({
          query: { name: 'example.com', type: 'A' },
          success: true,
          answers: [{ name: 'example.com', type: 'A', ttl: 300, data: '192.0.2.99' }],
        });

      const results = await collector.collectFromAuthoritativeServers(
        { name: 'example.com', type: 'A' },
        nsServers
      );

      const divergence = collector.detectDivergence(results);

      expect(divergence.hasDivergence).toBe(true);
      expect(divergence.serversWithDifferentAnswers).toHaveLength(2);
    });
  });

  describe('Glue Record Capture', () => {
    it('should extract glue records from additional section', async () => {
      const collector = new DelegationCollector('example.com');

      mockQuery.mockResolvedValueOnce({
        query: { name: 'example.com', type: 'NS' },
        success: true,
        answers: [{ name: 'example.com', type: 'NS', ttl: 86400, data: 'ns1.example.com' }],
        additional: [
          { name: 'ns1.example.com', type: 'A', ttl: 86400, data: '192.0.2.53' },
          { name: 'ns1.example.com', type: 'AAAA', ttl: 86400, data: '2001:db8::53' },
        ],
      });

      const result = await collector.collectParentDelegation('8.8.8.8');
      const glue = collector.extractGlueRecords(result);

      expect(glue).toHaveLength(2);
      expect(glue[0].name).toBe('ns1.example.com');
      expect(glue[0].type).toBe('A');
    });

    it('should detect missing glue when NS is in-zone', async () => {
      const collector = new DelegationCollector('example.com');

      mockQuery.mockResolvedValueOnce({
        query: { name: 'example.com', type: 'NS' },
        success: true,
        answers: [{ name: 'example.com', type: 'NS', ttl: 86400, data: 'ns1.example.com' }],
        additional: [], // Missing glue!
      });

      const result = await collector.collectParentDelegation('8.8.8.8');
      const missingGlue = collector.detectMissingGlue(result);

      expect(missingGlue).toHaveLength(1);
      expect(missingGlue[0]).toBe('ns1.example.com');
    });
  });

  describe('DNSSEC Observation Fields', () => {
    it('should capture DO bit and AD flag from resolver', async () => {
      const collector = new DelegationCollector('example.com');

      mockQuery.mockResolvedValueOnce({
        query: { name: 'example.com', type: 'A' },
        success: true,
        answers: [{ name: 'example.com', type: 'A', ttl: 300, data: '192.0.2.1' }],
        flags: {
          aa: true,
          ad: true, // Authenticated data (DNSSEC validated)
          cd: false,
        },
      });

      const result = await collector.collectWithDnssec('example.com', 'A', '8.8.8.8');

      expect(result.flags?.ad).toBe(true);
    });

    it('should capture RRSIG records when present', async () => {
      const collector = new DelegationCollector('example.com');

      mockQuery.mockResolvedValueOnce({
        query: { name: 'example.com', type: 'A' },
        success: true,
        answers: [{ name: 'example.com', type: 'A', ttl: 300, data: '192.0.2.1' }],
        authority: [{ name: 'example.com', type: 'RRSIG', ttl: 300, data: 'A 8 2 300...' }],
      });

      const result = await collector.collectWithDnssec('example.com', 'A', '8.8.8.8');
      const rrsig = result.authority?.find((r: DNSAnswer) => r.type === 'RRSIG');

      expect(rrsig).toBeDefined();
    });

    it('should capture DNSKEY for zone when queried', async () => {
      const collector = new DelegationCollector('example.com');

      mockQuery.mockResolvedValueOnce({
        query: { name: 'example.com', type: 'DNSKEY' },
        success: true,
        answers: [
          { name: 'example.com', type: 'DNSKEY', ttl: 3600, data: '256 3 8 AwEAA...' },
          { name: 'example.com', type: 'DNSKEY', ttl: 3600, data: '257 3 8 AwEAA...' },
        ],
      });

      const result = await collector.collectDnskey('example.com', '8.8.8.8');

      expect(result.answers).toHaveLength(2);
      expect(result.answers[0].type).toBe('DNSKEY');
    });
  });

  describe('Lame Delegation Detection', () => {
    it('should detect lame delegation when NS is not authoritative', async () => {
      const collector = new DelegationCollector('example.com');
      const nsServers = ['ns1.example.com'];

      mockQuery.mockResolvedValueOnce({
        query: { name: 'example.com', type: 'NS' },
        success: true,
        answers: [], // Empty answer with AA=0
        flags: {
          aa: false, // Not authoritative!
        },
      });

      const results = await collector.collectFromAuthoritativeServers(
        { name: 'example.com', type: 'NS' },
        nsServers
      );

      const lame = collector.detectLameDelegation(results);

      expect(lame).toHaveLength(1);
      expect(lame[0].server).toBe('ns1.example.com');
      expect(lame[0].reason).toBe('not-authoritative');
    });

    it('should detect timeout from authoritative server', async () => {
      const collector = new DelegationCollector('example.com');
      const nsServers = ['ns1.example.com'];

      mockQuery.mockResolvedValueOnce({
        query: { name: 'example.com', type: 'A' },
        success: false,
        error: 'timeout',
      });

      const results = await collector.collectFromAuthoritativeServers(
        { name: 'example.com', type: 'A' },
        nsServers
      );

      const lame = collector.detectLameDelegation(results);

      expect(lame).toHaveLength(1);
      expect(lame[0].reason).toBe('timeout');
    });
  });

  describe('Delegation Summary', () => {
    it('should generate delegation summary with all sources', async () => {
      const collector = new DelegationCollector('example.com');

      // Mock parent zone response
      mockQuery
        .mockResolvedValueOnce({
          query: { name: 'example.com', type: 'NS' },
          success: true,
          answers: [
            { name: 'example.com', type: 'NS', ttl: 86400, data: 'ns1.example.com' },
            { name: 'example.com', type: 'NS', ttl: 86400, data: 'ns2.example.com' },
          ],
          additional: [{ name: 'ns1.example.com', type: 'A', ttl: 86400, data: '192.0.2.1' }],
        })
        // Mock auth server responses
        .mockResolvedValueOnce({
          query: { name: 'example.com', type: 'NS' },
          success: true,
          answers: [
            { name: 'example.com', type: 'NS', ttl: 86400, data: 'ns1.example.com' },
            { name: 'example.com', type: 'NS', ttl: 86400, data: 'ns2.example.com' },
          ],
          flags: { aa: true },
        })
        .mockResolvedValueOnce({
          query: { name: 'example.com', type: 'NS' },
          success: true,
          answers: [
            { name: 'example.com', type: 'NS', ttl: 86400, data: 'ns1.example.com' },
            { name: 'example.com', type: 'NS', ttl: 86400, data: 'ns2.example.com' },
          ],
          flags: { aa: true },
        });

      const summary = await collector.collectDelegationSummary('8.8.8.8');

      expect(summary.parentNs).toHaveLength(2);
      expect(summary.authoritativeResponses).toHaveLength(2);
      expect(summary.glueRecords).toHaveLength(1);
      expect(summary.hasDivergence).toBe(false);
    });
  });
});
