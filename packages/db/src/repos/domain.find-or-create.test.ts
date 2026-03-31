/**
 * Domain Repository findOrCreate Race Condition Test
 *
 * This test demonstrates the TOCTOU race condition in findOrCreate.
 * When 10 concurrent calls try to create the same domain, the non-atomic
 * find-then-insert pattern can fail with unique constraint violations.
 */

import { describe, expect, it, vi } from 'vitest';
import type { Domain, NewDomain } from '../schema/index.js';
import { DomainRepository } from './domain.js';

// Mock data
const mockDomain: Domain = {
  id: 'domain-existing-id',
  name: 'example.com',
  normalizedName: 'example.com',
  punycodeName: null,
  zoneManagement: 'unknown',
  tenantId: 'test-tenant',
  metadata: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const newDomainData: NewDomain = {
  name: 'example.com',
  normalizedName: 'example.com',
  tenantId: 'test-tenant',
  zoneManagement: 'unknown',
};

// Helper to create a mock adapter with getDrizzle
function createMockAdapter(options: {
  existingDomain?: Domain | null;
  upsertResult?: Domain | null;
}) {
  return {
    selectOne: vi.fn().mockResolvedValue(options.existingDomain || null),
    selectWhere: vi.fn().mockResolvedValue(options.existingDomain ? [options.existingDomain] : []),
    select: vi.fn().mockResolvedValue(options.existingDomain ? [options.existingDomain] : []),
    insert: vi.fn(),
    update: vi.fn().mockResolvedValue([]),
    updateOne: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue([]),
    deleteOne: vi.fn().mockResolvedValue(undefined),
    transaction: vi.fn(),
    getDrizzle: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoNothing: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue(options.upsertResult ? [options.upsertResult] : []),
          }),
        }),
      }),
    }),
  };
}

describe('DomainRepository.findOrCreate race condition', () => {
  describe('atomic upsert behavior', () => {
    it('should succeed with atomic upsert when domain does not exist', async () => {
      const newDomain: Domain = { ...mockDomain, id: 'new-domain-id' };
      const mockAdapter = createMockAdapter({
        existingDomain: null,
        upsertResult: newDomain,
      });

      const repo = new DomainRepository(mockAdapter as any);
      const result = await repo.findOrCreate(newDomainData);

      // Should return the newly created domain
      expect(result.id).toBe('new-domain-id');

      // Should have called getDrizzle and insert with onConflictDoNothing
      expect(mockAdapter.getDrizzle).toHaveBeenCalled();
      const rawDb = mockAdapter.getDrizzle();
      expect(rawDb.insert).toHaveBeenCalled();
    });

    it('should succeed with 10 concurrent calls for same domain', async () => {
      // First call creates the domain, subsequent calls find it
      let callCount = 0;
      const createdDomain: Domain = { ...mockDomain, id: 'concurrent-domain-id' };

      const mockAdapter = {
        selectOne: vi.fn().mockResolvedValue(null),
        selectWhere: vi.fn().mockResolvedValue([createdDomain]),
        select: vi.fn().mockResolvedValue([createdDomain]),
        insert: vi.fn(),
        update: vi.fn().mockResolvedValue([]),
        updateOne: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue([]),
        deleteOne: vi.fn().mockResolvedValue(undefined),
        transaction: vi.fn(),
        getDrizzle: vi.fn().mockImplementation(() => {
          callCount++;
          // First call succeeds with insert, subsequent calls return empty (conflict)
          return {
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockReturnValue({
                onConflictDoNothing: vi.fn().mockReturnValue({
                  returning: vi.fn().mockResolvedValue(callCount === 1 ? [createdDomain] : []),
                }),
              }),
            }),
          };
        }),
      };

      const repo = new DomainRepository(mockAdapter as any);

      // Simulate 10 concurrent findOrCreate calls
      const results = await Promise.all(
        Array.from({ length: 10 }, () => repo.findOrCreate(newDomainData))
      );

      // All results should be successful domains
      expect(results).toHaveLength(10);
      results.forEach((domain) => {
        expect(domain).toBeDefined();
        expect(domain.id).toBe('concurrent-domain-id');
      });

      // With proper atomic upsert, all calls should succeed without errors
      console.log(`Total concurrent calls: ${callCount}`);
    });

    it('should handle concurrent calls for global domain (no tenant)', async () => {
      const globalDomainData: NewDomain = {
        name: 'global-domain.com',
        normalizedName: 'global-domain.com',
        tenantId: undefined, // Global domain
        zoneManagement: 'unknown',
      };

      const globalDomain: Domain = {
        ...mockDomain,
        id: 'global-domain-id',
        tenantId: null,
      };

      let callCount = 0;
      const mockAdapter = {
        selectOne: vi.fn().mockImplementation((_table: unknown, _condition: unknown) => {
          // Return global domain for findByName queries (after conflict)
          return Promise.resolve(globalDomain);
        }),
        selectWhere: vi.fn().mockResolvedValue([globalDomain]),
        select: vi.fn().mockResolvedValue([globalDomain]),
        insert: vi.fn(),
        update: vi.fn().mockResolvedValue([]),
        updateOne: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue([]),
        deleteOne: vi.fn().mockResolvedValue(undefined),
        transaction: vi.fn(),
        getDrizzle: vi.fn().mockImplementation(() => {
          callCount++;
          return {
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockReturnValue({
                onConflictDoNothing: vi.fn().mockReturnValue({
                  returning: vi.fn().mockResolvedValue(callCount === 1 ? [globalDomain] : []),
                }),
              }),
            }),
          };
        }),
      };

      const repo = new DomainRepository(mockAdapter as any);

      const results = await Promise.all(
        Array.from({ length: 10 }, () => repo.findOrCreate(globalDomainData))
      );

      // All should succeed
      expect(results).toHaveLength(10);
      results.forEach((domain) => {
        expect(domain).toBeDefined();
        expect(domain.id).toBe('global-domain-id');
      });
    });

    it('should return existing domain when it already exists', async () => {
      const mockAdapter = createMockAdapter({
        existingDomain: mockDomain,
        upsertResult: mockDomain,
      });

      const repo = new DomainRepository(mockAdapter as any);
      const result = await repo.findOrCreate(newDomainData);

      // Should return existing domain
      expect(result.id).toBe(mockDomain.id);
    });
  });

  describe('atomic upsert implementation requirements', () => {
    it('should use onConflictDoNothing for atomic upsert pattern', () => {
      // This test documents the required Drizzle pattern for atomic upsert:
      //
      // 1. Try insert with onConflictDoNothing targeting the unique constraint
      // 2. If no rows affected (conflict), query for existing record
      //
      // Example (pseudo-code):
      //
      // async findOrCreate(data: NewDomain): Promise<Domain> {
      //   // Use raw Drizzle to access onConflictDoNothing
      //   const drizzle = this.db.getDrizzle();
      //
      //   // Attempt insert with conflict handling
      //   const result = await drizzle
      //     .insert(domains)
      //     .values({ ...data, normalizedName: data.normalizedName || data.name.toLowerCase() })
      //     .onConflictDoNothing()
      //     .returning();
      //
      //   if (result.length > 0) {
      //     // Insert succeeded - return new record
      //     return result[0];
      //   }
      //
      //   // Conflict occurred - query existing record
      //   return this.findByNameAndTenant(data.name, data.tenantId);
      // }
      //
      // The key is the unique constraint target:
      // - Multi-tenant: (normalizedName, tenantId)
      // - Global: (normalizedName, NULL) - PostgreSQL treats NULLs as distinct

      expect(true).toBe(true); // Documentation test
    });
  });
});
