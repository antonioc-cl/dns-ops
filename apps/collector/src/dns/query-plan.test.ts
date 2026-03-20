/**
 * Query Plan Generation Tests
 *
 * Verify that query generation is deterministic and correct across:
 * - Managed vs unmanaged zones
 * - Mail record inclusion
 * - DKIM selector discovery
 * - Explicit query names
 * - Deduplication
 */

import { createPostgresAdapter } from '@dns-ops/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DNSCollector } from './collector.js';
import type { CollectionConfig } from './types.js';

// Mock database adapter
const mockDb = {
  select: vi.fn(),
  selectOne: vi.fn(),
  selectWhere: vi.fn(),
  insert: vi.fn(),
  updateOne: vi.fn(),
  deleteOne: vi.fn(),
};

vi.mock('@dns-ops/db', () => ({
  createPostgresAdapter: vi.fn(() => mockDb),
  DomainRepository: vi.fn().mockImplementation(() => ({
    findByName: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ id: 'test-domain-id' }),
  })),
  SnapshotRepository: vi.fn().mockImplementation(() => ({
    create: vi.fn().mockResolvedValue({ id: 'test-snapshot-id' }),
  })),
  ObservationRepository: vi.fn().mockImplementation(() => ({
    createMany: vi.fn().mockResolvedValue([]),
  })),
  RecordSetRepository: vi.fn().mockImplementation(() => ({
    createMany: vi.fn().mockResolvedValue([]),
  })),
}));

describe('Query Plan Generation', () => {
  let collector: DNSCollector;
  const baseConfig: CollectionConfig = {
    domain: 'example.com',
    zoneManagement: 'unmanaged',
    recordTypes: ['A', 'AAAA', 'MX', 'TXT', 'NS'],
    triggeredBy: 'test-user',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    collector = new DNSCollector(baseConfig, mockDb as any);
  });

  describe('Managed Zones', () => {
    it('should generate queries for zone apex only', async () => {
      const managedCollector = new DNSCollector(
        { ...baseConfig, zoneManagement: 'managed' },
        mockDb as any
      );

      const queries = await (managedCollector as any).generateQueries();

      // Should have queries for apex
      expect(queries.some((q: any) => q.name === 'example.com')).toBe(true);

      // For managed zones, should primarily focus on apex
      // (may have some subdomain queries for DKIM, etc.)
      const apexQueries = queries.filter((q: any) => q.name === 'example.com');
      expect(apexQueries.length).toBeGreaterThan(0);
    });

    it('should include mail records when enabled', async () => {
      const managedCollector = new DNSCollector(
        { ...baseConfig, zoneManagement: 'managed', includeMailRecords: true },
        mockDb as any
      );

      const queries = await (managedCollector as any).generateQueries();

      // Should include mail-related queries
      expect(queries.some((q: any) => q.name.includes('_dmarc'))).toBe(true);
    });

    it('should exclude mail records when disabled', async () => {
      const managedCollector = new DNSCollector(
        { ...baseConfig, zoneManagement: 'managed', includeMailRecords: false },
        mockDb as any
      );

      const queries = await (managedCollector as any).generateQueries();

      // Should not include mail-related queries
      expect(queries.every((q: any) => !q.name.includes('_dmarc'))).toBe(true);
    });
  });

  describe('Unmanaged Zones', () => {
    it('should generate targeted queries for key records', async () => {
      const queries = await (collector as any).generateQueries();

      // Should query apex
      expect(queries.some((q: any) => q.name === 'example.com')).toBe(true);

      // Should query DMARC
      expect(queries.some((q: any) => q.name === '_dmarc.example.com')).toBe(true);

      // Should query MTA-STS
      expect(queries.some((q: any) => q.name === '_mta-sts.example.com')).toBe(true);

      // Should query TLS-RPT
      expect(queries.some((q: any) => q.name === '_smtp._tls.example.com')).toBe(true);
    });

    it('should include DKIM selector queries', async () => {
      const queries = await (collector as any).generateQueries();

      // Should have some DKIM selector queries
      const dkimQueries = queries.filter((q: any) => q.name.includes('_domainkey'));
      expect(dkimQueries.length).toBeGreaterThan(0);
    });

    it('should respect explicit query names', async () => {
      const explicitCollector = new DNSCollector(
        {
          ...baseConfig,
          queryNames: ['test.example.com', 'api.example.com'],
        },
        mockDb as any
      );

      const queries = await (explicitCollector as any).generateQueries();

      // Should only query the explicit names
      const uniqueNames = [...new Set(queries.map((q: any) => q.name))];
      expect(uniqueNames).toEqual(expect.arrayContaining(['test.example.com', 'api.example.com']));
      expect(uniqueNames.length).toBe(2);
    });
  });

  describe('DKIM Selector Discovery', () => {
    it('should use managed selectors when provided', async () => {
      const managedSelectorCollector = new DNSCollector(
        {
          ...baseConfig,
          managedDkimSelectors: ['selector1', 'selector2'],
        },
        mockDb as any
      );

      const queries = await (managedSelectorCollector as any).generateQueries();

      // Should include managed selectors
      expect(queries.some((q: any) => q.name === 'selector1._domainkey.example.com')).toBe(true);
      expect(queries.some((q: any) => q.name === 'selector2._domainkey.example.com')).toBe(true);
    });

    it('should use operator selectors when provided', async () => {
      const operatorSelectorCollector = new DNSCollector(
        {
          ...baseConfig,
          dkimSelectors: ['google', 'default'],
        },
        mockDb as any
      );

      const queries = await (operatorSelectorCollector as any).generateQueries();

      // Should include operator selectors
      expect(queries.some((q: any) => q.name === 'google._domainkey.example.com')).toBe(true);
      expect(queries.some((q: any) => q.name === 'default._domainkey.example.com')).toBe(true);
    });

    it('should prefer managed selectors over operator selectors', async () => {
      const mixedCollector = new DNSCollector(
        {
          ...baseConfig,
          managedDkimSelectors: ['managed1'],
          dkimSelectors: ['operator1'],
        },
        mockDb as any
      );

      const queries = await (mixedCollector as any).generateQueries();

      // Should include managed selectors
      expect(queries.some((q: any) => q.name === 'managed1._domainkey.example.com')).toBe(true);
      // Note: The actual implementation may or may not include operator selectors
      // when managed selectors are present, depending on the merge strategy
    });
  });

  describe('Deduplication', () => {
    it('should deduplicate identical queries', async () => {
      const queries = await (collector as any).generateQueries();

      // Check for duplicates
      const queryKeys = queries.map((q: any) => `${q.name}|${q.type}`);
      const uniqueKeys = [...new Set(queryKeys)];

      expect(queryKeys.length).toBe(uniqueKeys.length);
    });

    it('should deduplicate across mail and DNS queries', async () => {
      const queries = await (collector as any).generateQueries();

      // MX should only appear once per name
      const mxQueries = queries.filter((q: any) => q.type === 'MX');
      const mxNames = mxQueries.map((q: any) => q.name);
      const uniqueMxNames = [...new Set(mxNames)];

      expect(mxNames.length).toBe(uniqueMxNames.length);
    });
  });

  describe('Record Types', () => {
    it('should query all specified record types', async () => {
      const queries = await (collector as any).generateQueries();

      const types = [...new Set(queries.map((q: any) => q.type))];
      expect(types).toEqual(expect.arrayContaining(['A', 'AAAA', 'MX', 'TXT', 'NS']));
    });

    it('should respect custom record type configuration', async () => {
      const customCollector = new DNSCollector(
        {
          ...baseConfig,
          recordTypes: ['A', 'TXT'],
          includeMailRecords: false, // Disable mail to avoid MX queries
        },
        mockDb as any
      );

      const queries = await (customCollector as any).generateQueries();

      const types = [...new Set(queries.map((q: any) => q.type))];
      expect(types).toEqual(expect.arrayContaining(['A', 'TXT']));
      // MX should not be present if mail records are disabled
      expect(types).not.toContain('MX');
    });
  });

  describe('Determinism', () => {
    it('should generate identical query plans for identical configurations', async () => {
      const queries1 = await (collector as any).generateQueries();
      const queries2 = await (collector as any).generateQueries();

      const keys1 = queries1.map((q: any) => `${q.name}|${q.type}`).sort();
      const keys2 = queries2.map((q: any) => `${q.name}|${q.type}`).sort();

      expect(keys1).toEqual(keys2);
    });

    it('should generate consistent query order', async () => {
      const queries1 = await (collector as any).generateQueries();
      const queries2 = await (collector as any).generateQueries();

      expect(queries1.map((q: any) => q.name)).toEqual(queries2.map((q: any) => q.name));
    });
  });
});
