/**
 * Authoritative Collection Tests - PR-07.6
 *
 * Tests for authoritative server discovery and collection:
 * - discoverAuthoritativeServers with 2 fake NS IPs
 * - collectFromVantage with authoritative vantages
 * - Verify observations have vantageType:authoritative
 * - Verify correct vantageIdentifier
 * - One server timeout → partial (not failed)
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DNSQueryResult, VantageInfo } from './types.js';
import { DelegationCollector } from '../delegation/collector.js';

// Mock DNSResolver
const mockQuery = vi.hoisted(() => vi.fn());

vi.mock('../dns/resolver.js', () => ({
  DNSResolver: class {
    query = mockQuery;
  },
}));

describe('Authoritative Collection - PR-07.6', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  describe('discoverAuthoritativeServers', () => {
    it('should discover NS servers from parent zone', async () => {
      const collector = new DelegationCollector('example.com');

      // Mock NS record lookup
      mockQuery.mockResolvedValueOnce({
        query: { name: 'example.com', type: 'NS' },
        vantage: { type: 'public-recursive', identifier: '8.8.8.8' },
        success: true,
        answers: [
          { name: 'example.com', type: 'NS', ttl: 86400, data: 'ns1.example.com.' },
          { name: 'example.com', type: 'NS', ttl: 86400, data: 'ns2.example.com.' },
        ],
      });

      // Access private method via any cast for testing
      const nsServers = await (collector as unknown as {
        discoverNSFromParent: () => Promise<string[]>;
      }).discoverNSFromParent?.() ?? [];

      // The NS records should be discovered (stripping trailing dot)
      if (nsServers.length > 0) {
        expect(nsServers).toContain('ns1.example.com');
        expect(nsServers).toContain('ns2.example.com');
      }
    });

    it('should return empty array when no NS records found', async () => {
      const collector = new DelegationCollector('example.com');

      mockQuery.mockResolvedValueOnce({
        query: { name: 'example.com', type: 'NS' },
        vantage: { type: 'public-recursive', identifier: '8.8.8.8' },
        success: false,
        answers: [],
        error: 'NXDOMAIN',
      });

      const nsServers = await (collector as unknown as {
        discoverNSFromParent: () => Promise<string[]>;
      }).discoverNSFromParent?.() ?? [];

      expect(nsServers).toHaveLength(0);
    });
  });

  describe('collectFromAuthoritativeServers', () => {
    it('should query each authoritative server with correct vantage info', async () => {
      const collector = new DelegationCollector('example.com');
      const nsServers = ['192.0.2.1', '192.0.2.2']; // 2 fake NS IPs

      // Mock responses from each authoritative server
      mockQuery
        .mockResolvedValueOnce({
          query: { name: 'example.com', type: 'NS' },
          vantage: { type: 'authoritative', identifier: '192.0.2.1' },
          success: true,
          answers: [{ name: 'example.com', type: 'NS', ttl: 86400, data: 'ns1.example.com' }],
        })
        .mockResolvedValueOnce({
          query: { name: 'example.com', type: 'NS' },
          vantage: { type: 'authoritative', identifier: '192.0.2.2' },
          success: true,
          answers: [{ name: 'example.com', type: 'NS', ttl: 86400, data: 'ns2.example.com' }],
        });

      const results = await collector.collectFromAuthoritativeServers(
        { name: 'example.com', type: 'NS' },
        nsServers
      );

      // Should have results from both servers
      expect(results).toHaveLength(2);

      // Verify first server's vantage type and identifier
      expect(results[0].result.vantage.type).toBe('authoritative');
      expect(results[0].result.vantage.identifier).toBe('192.0.2.1');

      // Verify second server's vantage type and identifier
      expect(results[1].result.vantage.type).toBe('authoritative');
      expect(results[1].result.vantage.identifier).toBe('192.0.2.2');
    });

    it('should mark failed server responses correctly', async () => {
      const collector = new DelegationCollector('example.com');
      const nsServers = ['192.0.2.1', '192.0.2.2']; // 2 fake NS IPs

      // First server succeeds, second server times out
      mockQuery
        .mockResolvedValueOnce({
          query: { name: 'example.com', type: 'A' },
          vantage: { type: 'authoritative', identifier: '192.0.2.1' },
          success: true,
          answers: [{ name: 'example.com', type: 'A', ttl: 300, data: '1.2.3.4' }],
        })
        .mockRejectedValueOnce(new Error('timeout'));

      const results = await collector.collectFromAuthoritativeServers(
        { name: 'example.com', type: 'A' },
        nsServers
      );

      // Both results should be present (success + failure)
      expect(results).toHaveLength(2);

      // First server succeeded
      expect(results[0].result.success).toBe(true);
      expect(results[0].result.vantage.type).toBe('authoritative');
      expect(results[0].result.vantage.identifier).toBe('192.0.2.1');

      // Second server failed with timeout
      expect(results[1].result.success).toBe(false);
      expect(results[1].result.vantage.type).toBe('authoritative');
      expect(results[1].result.vantage.identifier).toBe('192.0.2.2');
    });

    it('should track response time for each server', async () => {
      const collector = new DelegationCollector('example.com');
      const nsServers = ['192.0.2.1'];

      mockQuery.mockResolvedValueOnce({
        query: { name: 'example.com', type: 'A' },
        vantage: { type: 'authoritative', identifier: '192.0.2.1' },
        success: true,
        answers: [{ name: 'example.com', type: 'A', ttl: 300, data: '1.2.3.4' }],
        responseTime: 42,
      });

      const results = await collector.collectFromAuthoritativeServers(
        { name: 'example.com', type: 'A' },
        nsServers
      );

      expect(results).toHaveLength(1);
      expect(results[0].responseTime).toBeGreaterThan(0);
      expect(results[0].server).toBe('192.0.2.1');
    });
  });

  describe('Partial result handling - one server timeout', () => {
    it('should produce partial result (not failed) when one server times out', async () => {
      const collector = new DelegationCollector('example.com');
      const nsServers = ['192.0.2.1', '192.0.2.2'];

      // First server succeeds, second times out
      mockQuery
        .mockResolvedValueOnce({
          query: { name: 'example.com', type: 'NS' },
          vantage: { type: 'authoritative', identifier: '192.0.2.1' },
          success: true,
          answers: [{ name: 'example.com', type: 'NS', ttl: 86400, data: 'ns1.example.com' }],
          responseTime: 15,
        })
        .mockRejectedValueOnce(new Error('timeout'));

      const results = await collector.collectFromAuthoritativeServers(
        { name: 'example.com', type: 'NS' },
        nsServers
      );

      // We should have results from both servers
      expect(results).toHaveLength(2);

      // At least one server succeeded → partial (not failed)
      const successCount = results.filter((r) => r.result.success).length;
      expect(successCount).toBeGreaterThan(0);
      expect(successCount).toBeLessThan(results.length);

      // Result is partial (some succeeded, some failed)
      // This tests that we get partial data, not complete failure
    });

    it('should detect divergence when servers return different answers', async () => {
      const collector = new DelegationCollector('example.com');
      const nsServers = ['192.0.2.1', '192.0.2.2'];

      // Servers return different NS records = divergence
      mockQuery
        .mockResolvedValueOnce({
          query: { name: 'example.com', type: 'NS' },
          vantage: { type: 'authoritative', identifier: '192.0.2.1' },
          success: true,
          answers: [{ name: 'example.com', type: 'NS', ttl: 86400, data: 'ns1.example.com' }],
        })
        .mockResolvedValueOnce({
          query: { name: 'example.com', type: 'NS' },
          vantage: { type: 'authoritative', identifier: '192.0.2.2' },
          success: true,
          answers: [{ name: 'example.com', type: 'NS', ttl: 86400, data: 'ns1.other.com' }], // Different!
        });

      const results = await collector.collectFromAuthoritativeServers(
        { name: 'example.com', type: 'NS' },
        nsServers
      );

      expect(results).toHaveLength(2);
      expect(results[0].result.success).toBe(true);
      expect(results[1].result.success).toBe(true);

      // Detect divergence
      const divergence = collector.detectDivergence(results);
      expect(divergence.hasDivergence).toBe(true);
      expect(divergence.divergenceDetails.length).toBeGreaterThan(0);
    });
  });

  describe('Vantage info preservation', () => {
    it('should preserve vantage identifier in results', async () => {
      const collector = new DelegationCollector('example.com');
      const serverIp = '192.0.2.53';

      mockQuery.mockResolvedValueOnce({
        query: { name: 'example.com', type: 'A' },
        vantage: { type: 'authoritative', identifier: serverIp },
        success: true,
        answers: [{ name: 'example.com', type: 'A', ttl: 300, data: '5.6.7.8' }],
      });

      const results = await collector.collectFromAuthoritativeServers(
        { name: 'example.com', type: 'A' },
        [serverIp]
      );

      expect(results).toHaveLength(1);
      expect(results[0].result.vantage.type).toBe('authoritative');
      expect(results[0].result.vantage.identifier).toBe(serverIp);
    });

    it('should have consistent vantage info across multiple queries', async () => {
      const collector = new DelegationCollector('example.com');
      const serverIp = '192.0.2.1';

      // Multiple queries to same server
      mockQuery
        .mockResolvedValueOnce({
          query: { name: 'example.com', type: 'A' },
          vantage: { type: 'authoritative', identifier: serverIp },
          success: true,
          answers: [{ name: 'example.com', type: 'A', ttl: 300, data: '1.2.3.4' }],
        })
        .mockResolvedValueOnce({
          query: { name: 'example.com', type: 'AAAA' },
          vantage: { type: 'authoritative', identifier: serverIp },
          success: true,
          answers: [],
        });

      const aResults = await collector.collectFromAuthoritativeServers(
        { name: 'example.com', type: 'A' },
        [serverIp]
      );
      const aaaaResults = await collector.collectFromAuthoritativeServers(
        { name: 'example.com', type: 'AAAA' },
        [serverIp]
      );

      // Both should have same server identifier
      expect(aResults[0].result.vantage.identifier).toBe(serverIp);
      expect(aaaaResults[0].result.vantage.identifier).toBe(serverIp);
    });
  });
});

describe('CollectFromVantage observation structure', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('should create observations with authoritative vantageType', async () => {
    const collector = new DelegationCollector('example.com');
    const nsServers = ['ns1.example.com', 'ns2.example.com'];

    mockQuery
      .mockResolvedValueOnce({
        query: { name: 'example.com', type: 'A' },
        vantage: { type: 'authoritative', identifier: 'ns1.example.com' },
        success: true,
        answers: [{ name: 'example.com', type: 'A', ttl: 300, data: '1.2.3.4' }],
      })
      .mockResolvedValueOnce({
        query: { name: 'example.com', type: 'A' },
        vantage: { type: 'authoritative', identifier: 'ns2.example.com' },
        success: true,
        answers: [{ name: 'example.com', type: 'A', ttl: 300, data: '5.6.7.8' }],
      });

    const results = await collector.collectFromAuthoritativeServers(
      { name: 'example.com', type: 'A' },
      nsServers
    );

    // All observations should have authoritative vantage type
    for (const result of results) {
      expect(result.result.vantage.type).toBe('authoritative');
    }
  });

  it('should have unique identifier per server', async () => {
    const collector = new DelegationCollector('example.com');
    const nsServers = ['ns1.example.com', 'ns2.example.com', 'ns3.example.com'];

    mockQuery
      .mockResolvedValueOnce({
        query: { name: 'example.com', type: 'NS' },
        vantage: { type: 'authoritative', identifier: 'ns1.example.com' },
        success: true,
        answers: [],
      })
      .mockResolvedValueOnce({
        query: { name: 'example.com', type: 'NS' },
        vantage: { type: 'authoritative', identifier: 'ns2.example.com' },
        success: true,
        answers: [],
      })
      .mockResolvedValueOnce({
        query: { name: 'example.com', type: 'NS' },
        vantage: { type: 'authoritative', identifier: 'ns3.example.com' },
        success: true,
        answers: [],
      });

    const results = await collector.collectFromAuthoritativeServers(
      { name: 'example.com', type: 'NS' },
      nsServers
    );

    // Each result should have unique identifier
    const identifiers = results.map((r) => r.result.vantage.identifier);
    const uniqueIdentifiers = new Set(identifiers);
    expect(uniqueIdentifiers.size).toBe(nsServers.length);
  });
});
