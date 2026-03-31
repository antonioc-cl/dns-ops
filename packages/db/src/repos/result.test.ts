import { Result } from '@dns-ops/contracts';
import { describe, expect, it } from 'vitest';
import {
  DbError,
  dbResult,
  dbResultOrNotFound,
  ensureTenantIsolation,
  isDbError,
  partitionDbResults,
  toNotFoundError,
  toTenantIsolationError,
  unwrapDbResultOr,
} from './result.js';

describe('Database Result Utilities', () => {
  describe('DbError', () => {
    it('should create a basic DbError', () => {
      const error = new DbError({
        message: 'Test error',
        code: 'QUERY_FAILED',
        table: 'Domain',
        operation: 'find',
      });

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('QUERY_FAILED');
      expect(error.table).toBe('Domain');
      expect(error.operation).toBe('find');
      expect(error._tag).toBe('DbError');
    });

    it('should create NOT_FOUND error with factory', () => {
      const error = DbError.notFound('Domain', 'domain-123');

      expect(error.code).toBe('NOT_FOUND');
      expect(error.table).toBe('Domain');
      expect(error.identifier).toBe('domain-123');
      expect(error.message).toContain('domain-123');
    });

    it('should create TENANT_ISOLATION error with factory', () => {
      const error = DbError.tenantIsolation('Domain', 'tenant-1', 'tenant-2');

      expect(error.code).toBe('TENANT_ISOLATION');
      expect(error.tenantId).toBe('tenant-1');
      expect(error.resourceTenantId).toBe('tenant-2');
      expect(error.message).toContain('Cross-tenant');
    });

    it('should create ALREADY_EXISTS error with factory', () => {
      const error = DbError.alreadyExists('Domain', 'example.com');

      expect(error.code).toBe('ALREADY_EXISTS');
      expect(error.identifier).toBe('example.com');
      expect(error.message).toContain('already exists');
    });

    it('should include additional properties', () => {
      const error = new DbError({
        message: 'Complex error',
        code: 'CONSTRAINT_VIOLATION',
        table: 'Domain',
        identifier: 'test-id',
      });

      expect(error.identifier).toBe('test-id');
      expect(error.table).toBe('Domain');
    });
  });

  describe('isDbError', () => {
    it('should return true for DbError', () => {
      const error = DbError.notFound('Domain', 'id');
      expect(isDbError(error)).toBe(true);
    });

    it('should return false for regular Error', () => {
      expect(isDbError(new Error('test'))).toBe(false);
    });

    it('should return false for null', () => {
      expect(isDbError(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isDbError(undefined)).toBe(false);
    });
  });

  describe('dbResult', () => {
    it('should return Ok for successful operation', async () => {
      const result = await dbResult(async () => 'success');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe('success');
      }
    });

    it('should return Err for failed operation', async () => {
      const result = await dbResult(async () => {
        throw new Error('DB failed');
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('QUERY_FAILED');
        expect(result.error.message).toBe('DB failed');
      }
    });

    it('should use custom error mapper', async () => {
      const result = await dbResult(
        async () => {
          throw new Error('timeout');
        },
        () =>
          new DbError({
            message: 'Custom timeout',
            code: 'TIMEOUT',
          })
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('TIMEOUT');
        expect(result.error.message).toBe('Custom timeout');
      }
    });
  });

  describe('dbResultOrNotFound', () => {
    it('should return Ok when value exists', async () => {
      const result = await dbResultOrNotFound(
        async () => ({ id: '1', name: 'Test' }),
        'Domain',
        '1'
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.name).toBe('Test');
      }
    });

    it('should return Err NOT_FOUND when undefined', async () => {
      const result = await dbResultOrNotFound(async () => undefined, 'Domain', 'missing-id');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('NOT_FOUND');
        expect(result.error.identifier).toBe('missing-id');
      }
    });

    it('should return Err NOT_FOUND when null', async () => {
      const result = await dbResultOrNotFound(async () => null, 'Snapshot', 'missing-id');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });
  });

  describe('ensureTenantIsolation', () => {
    it('should return Ok for matching tenant', () => {
      const resource = { id: '1', tenantId: 'tenant-1' };
      const result = ensureTenantIsolation(resource, 'tenant-1', 'tenant-1', 'Domain');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.id).toBe('1');
      }
    });

    it('should return Ok for public resource (no tenant)', () => {
      const resource = { id: '1', tenantId: null };
      const result = ensureTenantIsolation(resource, null, 'tenant-1', 'Domain');

      expect(result.isOk()).toBe(true);
    });

    it('should return Err TENANT_ISOLATION for mismatch', () => {
      const resource = { id: '1', tenantId: 'tenant-2' };
      const result = ensureTenantIsolation(resource, 'tenant-2', 'tenant-1', 'Domain');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('TENANT_ISOLATION');
        expect(result.error.tenantId).toBe('tenant-1');
      }
    });

    it('should return Err NOT_FOUND for undefined resource', () => {
      const result = ensureTenantIsolation(undefined, 'tenant-1', 'tenant-1', 'Domain');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });
  });

  describe('partitionDbResults', () => {
    it('should separate successes and failures', () => {
      const results = [
        Result.ok('a'),
        Result.err(DbError.notFound('Domain', '1')),
        Result.ok('b'),
        Result.err(DbError.notFound('Domain', '2')),
      ];

      const { ok, err } = partitionDbResults(results);

      expect(ok).toHaveLength(2);
      expect(err).toHaveLength(2);
      expect(ok).toContain('a');
      expect(ok).toContain('b');
    });

    it('should handle all successes', () => {
      const results = [Result.ok('a'), Result.ok('b'), Result.ok('c')];
      const { ok, err } = partitionDbResults(results);

      expect(ok).toHaveLength(3);
      expect(err).toHaveLength(0);
    });

    it('should handle all failures', () => {
      const results = [
        Result.err(DbError.notFound('Domain', '1')),
        Result.err(DbError.notFound('Domain', '2')),
      ];
      const { ok, err } = partitionDbResults(results);

      expect(ok).toHaveLength(0);
      expect(err).toHaveLength(2);
    });

    it('should handle empty array', () => {
      const { ok, err } = partitionDbResults([]);

      expect(ok).toHaveLength(0);
      expect(err).toHaveLength(0);
    });
  });

  describe('unwrapDbResultOr', () => {
    it('should return value for Ok', () => {
      const result = Result.ok('success');
      const value = unwrapDbResultOr(result, 'default');

      expect(value).toBe('success');
    });

    it('should return default for Err', () => {
      const result = Result.err(DbError.notFound('Domain', '1'));
      const value = unwrapDbResultOr(result, 'default');

      expect(value).toBe('default');
    });
  });

  describe('toNotFoundError', () => {
    it('should convert DbError to NotFoundError', () => {
      const dbError = DbError.notFound('Domain', 'domain-123');
      const notFound = toNotFoundError(dbError);

      expect(notFound._tag).toBe('NotFoundError');
      expect(notFound.message).toContain('domain-123');
      expect(notFound.resourceType).toBe('Domain');
    });
  });

  describe('toTenantIsolationError', () => {
    it('should convert DbError to TenantIsolationError', () => {
      const dbError = DbError.tenantIsolation('Domain', 'tenant-1', 'tenant-2');
      const isolation = toTenantIsolationError(dbError);

      expect(isolation._tag).toBe('TenantIsolationError');
      expect(isolation.tenantId).toBe('tenant-1');
      expect(isolation.resourceTenantId).toBe('tenant-2');
    });
  });
});
