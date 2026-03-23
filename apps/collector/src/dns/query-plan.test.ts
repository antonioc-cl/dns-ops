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

import type { IDatabaseAdapter } from '@dns-ops/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DNSCollector } from './collector.js';
import type { CollectionConfig, DNSQuery } from './types.js';

const mockDb: IDatabaseAdapter = {
  select: vi.fn(),
  selectOne: vi.fn(),
  selectWhere: vi.fn(),
  insert: vi.fn(),
  insertMany: vi.fn(),
  updateOne: vi.fn(),
  deleteOne: vi.fn(),
  transaction: vi.fn(),
  getDrizzle: vi.fn(),
};

vi.mock('@dns-ops/db', () => {
  class MockDomainRepository {
    findByName = vi.fn().mockResolvedValue(null);
    create = vi.fn().mockResolvedValue({ id: 'test-domain-id', tenantId: 'test-tenant-id' });
    update = vi.fn().mockResolvedValue({ id: 'test-domain-id', tenantId: 'test-tenant-id' });
  }

  class MockSnapshotRepository {
    create = vi.fn().mockResolvedValue({ id: 'test-snapshot-id' });
    updateRulesetVersion = vi.fn().mockResolvedValue({ id: 'test-snapshot-id' });
  }

  class MockObservationRepository {
    createMany = vi.fn().mockResolvedValue([]);
  }

  class MockRecordSetRepository {
    createMany = vi.fn().mockResolvedValue([]);
  }

  class MockFindingRepository {
    createMany = vi.fn().mockResolvedValue([]);
  }

  class MockSuggestionRepository {
    createMany = vi.fn().mockResolvedValue([]);
  }

  class MockRulesetVersionRepository {
    findByVersion = vi.fn().mockResolvedValue({ id: 'ruleset-version-id', version: '1.2.0' });
    create = vi.fn().mockResolvedValue({ id: 'ruleset-version-id', version: '1.2.0' });
  }

  return {
    DomainRepository: MockDomainRepository,
    SnapshotRepository: MockSnapshotRepository,
    ObservationRepository: MockObservationRepository,
    RecordSetRepository: MockRecordSetRepository,
    FindingRepository: MockFindingRepository,
    SuggestionRepository: MockSuggestionRepository,
    RulesetVersionRepository: MockRulesetVersionRepository,
  };
});

function getQueries(instance: DNSCollector): Promise<DNSQuery[]> {
  return (instance as unknown as { generateQueries(): Promise<DNSQuery[]> }).generateQueries();
}

describe('Query Plan Generation', () => {
  let collector: DNSCollector;
  const baseConfig: CollectionConfig = {
    tenantId: 'test-tenant-id',
    domain: 'example.com',
    zoneManagement: 'unmanaged',
    recordTypes: ['A', 'AAAA', 'MX', 'TXT', 'NS'],
    triggeredBy: 'test-user',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    collector = new DNSCollector(baseConfig, mockDb);
  });

  describe('Managed Zones', () => {
    it('should generate queries for zone apex only', async () => {
      const managedCollector = new DNSCollector(
        { ...baseConfig, zoneManagement: 'managed' },
        mockDb
      );
      const queries = await getQueries(managedCollector);

      expect(queries.some((query) => query.name === 'example.com')).toBe(true);
      const apexQueries = queries.filter((query) => query.name === 'example.com');
      expect(apexQueries.length).toBeGreaterThan(0);
    });

    it('should include mail records when enabled', async () => {
      const managedCollector = new DNSCollector(
        { ...baseConfig, zoneManagement: 'managed', includeMailRecords: true },
        mockDb
      );
      const queries = await getQueries(managedCollector);

      expect(queries.some((query) => query.name.includes('_dmarc'))).toBe(true);
    });

    it('should exclude mail records when disabled', async () => {
      const managedCollector = new DNSCollector(
        { ...baseConfig, zoneManagement: 'managed', includeMailRecords: false },
        mockDb
      );
      const queries = await getQueries(managedCollector);

      expect(queries.every((query) => !query.name.includes('_dmarc'))).toBe(true);
    });
  });

  describe('Unmanaged Zones', () => {
    it('should generate targeted queries for key records', async () => {
      const queries = await getQueries(collector);

      expect(queries.some((query) => query.name === 'example.com')).toBe(true);
      expect(queries.some((query) => query.name === '_dmarc.example.com')).toBe(true);
      expect(queries.some((query) => query.name === '_mta-sts.example.com')).toBe(true);
      expect(queries.some((query) => query.name === '_smtp._tls.example.com')).toBe(true);
    });

    it('should include DKIM selector queries', async () => {
      const queries = await getQueries(collector);
      const dkimQueries = queries.filter((query) => query.name.includes('_domainkey'));
      expect(dkimQueries.length).toBeGreaterThan(0);
    });

    it('should respect explicit query names', async () => {
      const explicitCollector = new DNSCollector(
        {
          ...baseConfig,
          queryNames: ['example.com', 'www.example.com'],
          includeMailRecords: false,
        },
        mockDb
      );
      const queries = await getQueries(explicitCollector);

      expect(
        queries.every((query) => ['example.com', 'www.example.com'].includes(query.name))
      ).toBe(true);
    });
  });

  describe('DKIM Selector Discovery', () => {
    it('should use managed selectors when provided', async () => {
      const managedSelectorCollector = new DNSCollector(
        {
          ...baseConfig,
          managedDkimSelectors: ['google', 'selector1'],
        },
        mockDb
      );
      const queries = await getQueries(managedSelectorCollector);

      expect(queries.some((query) => query.name === 'google._domainkey.example.com')).toBe(true);
      expect(queries.some((query) => query.name === 'selector1._domainkey.example.com')).toBe(true);
    });

    it('should use operator selectors when provided', async () => {
      const operatorSelectorCollector = new DNSCollector(
        {
          ...baseConfig,
          dkimSelectors: ['custom', 'mail'],
        },
        mockDb
      );
      const queries = await getQueries(operatorSelectorCollector);

      expect(queries.some((query) => query.name === 'custom._domainkey.example.com')).toBe(true);
      expect(queries.some((query) => query.name === 'mail._domainkey.example.com')).toBe(true);
    });

    it('should prefer managed selectors over operator selectors', async () => {
      const mixedCollector = new DNSCollector(
        {
          ...baseConfig,
          managedDkimSelectors: ['managed'],
          dkimSelectors: ['operator'],
        },
        mockDb
      );
      const queries = await getQueries(mixedCollector);
      const dkimQueries = queries.filter((query) => query.name.includes('._domainkey.example.com'));

      expect(dkimQueries.some((query) => query.name === 'managed._domainkey.example.com')).toBe(
        true
      );
      expect(dkimQueries.some((query) => query.name === 'operator._domainkey.example.com')).toBe(
        false
      );
    });
  });

  describe('Deduplication', () => {
    it('should deduplicate identical queries', async () => {
      const duplicateCollector = new DNSCollector(
        {
          ...baseConfig,
          queryNames: ['example.com', 'example.com'],
          includeMailRecords: false,
        },
        mockDb
      );
      const queries = await getQueries(duplicateCollector);
      const uniqueQueries = new Set(queries.map((query) => `${query.name}:${query.type}`));

      expect(queries.length).toBe(uniqueQueries.size);
    });

    it('should deduplicate across mail and DNS queries', async () => {
      const queries = await getQueries(collector);
      const uniqueQueries = new Set(queries.map((query) => `${query.name}:${query.type}`));

      expect(queries.length).toBe(uniqueQueries.size);
    });
  });

  describe('Record Types', () => {
    it('should query all specified record types', async () => {
      const queries = await getQueries(collector);
      const apexQueries = queries.filter((query) => query.name === 'example.com');
      const queryTypes = new Set(apexQueries.map((query) => query.type));

      expect(queryTypes.has('A')).toBe(true);
      expect(queryTypes.has('AAAA')).toBe(true);
      expect(queryTypes.has('MX')).toBe(true);
      expect(queryTypes.has('TXT')).toBe(true);
      expect(queryTypes.has('NS')).toBe(true);
    });

    it('should respect custom record type configuration', async () => {
      const customCollector = new DNSCollector(
        {
          ...baseConfig,
          recordTypes: ['A', 'MX'],
          includeMailRecords: false,
        },
        mockDb
      );
      const queries = await getQueries(customCollector);
      const queryTypes = new Set(queries.map((query) => query.type));

      expect(queryTypes.has('A')).toBe(true);
      expect(queryTypes.has('MX')).toBe(true);
      expect(queryTypes.has('AAAA')).toBe(false);
      expect(queryTypes.has('TXT')).toBe(false);
      expect(queryTypes.has('NS')).toBe(false);
    });
  });

  describe('Determinism', () => {
    it('should generate identical query plans for identical configurations', async () => {
      const collector1 = new DNSCollector(baseConfig, mockDb);
      const collector2 = new DNSCollector(baseConfig, mockDb);
      const queries1 = await getQueries(collector1);
      const queries2 = await getQueries(collector2);

      expect(queries1).toEqual(queries2);
    });

    it('should generate consistent query order', async () => {
      const queries1 = await getQueries(collector);
      const queries2 = await getQueries(collector);

      expect(queries1).toEqual(queries2);
    });
  });
});
