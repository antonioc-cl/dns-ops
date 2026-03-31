/**
 * Domain Repository - Result-based methods
 *
 * These methods complement the existing DomainRepository methods
 * for gradual migration to Result-based error handling.
 */

import { Result, type ResultOrError } from '@dns-ops/contracts';
import type { Domain, NewDomain } from '../schema/index.js';
import {
  DbError,
  dbResult,
  dbResultOrNotFound,
  ensureTenantIsolation,
} from './result.js';
import { DomainRepository, type DomainFilter } from './domain.js';

// Re-export for convenience
export { DbError, type DbErrorCode } from './result.js';

/**
 * Result-based wrapper for DomainRepository
 *
 * @example
 * ```typescript
 * const repo = new DomainRepository(db);
 * const result = await repo.findByIdResult('domain-123');
 *
 * if (result.isOk()) {
 *   console.log(result.value.name);
 * } else {
 *   console.error(result.error.code); // 'NOT_FOUND'
 * }
 * ```
 */
export class DomainRepositoryResults {
  constructor(private repo: DomainRepository) {}

  /**
   * Find a domain by ID, returning a Result
   */
  async findByIdResult(id: string): Promise<ResultOrError<Domain, DbError>> {
    return dbResultOrNotFound(() => this.repo.findById(id), 'Domain', id);
  }

  /**
   * Find a domain by name with tenant isolation
   */
  async findByNameResult(
    normalizedName: string,
    tenantId?: string
  ): Promise<ResultOrError<Domain, DbError>> {
    const result = await dbResultOrNotFound(
      () =>
        tenantId
          ? this.repo.findByNameAndTenant(normalizedName, tenantId)
          : this.repo.findByName(normalizedName),
      'Domain',
      normalizedName
    );

    // Apply tenant isolation check if tenantId provided
    if (tenantId && result.isOk()) {
      return ensureTenantIsolation(
        result.value,
        result.value.tenantId,
        tenantId,
        'Domain'
      );
    }

    return result;
  }

  /**
   * Find a domain by name with mandatory tenant isolation
   * Returns error if domain belongs to different tenant
   */
  async findByNameForTenantResult(
    normalizedName: string,
    tenantId: string
  ): Promise<ResultOrError<Domain, DbError>> {
    const domain = await this.repo.findByNameForTenant(normalizedName, tenantId);

    if (!domain) {
      // Check if domain exists under different tenant
      const existing = await this.repo.findByName(normalizedName);
      if (existing?.tenantId && existing.tenantId !== tenantId) {
        return Result.err(
          DbError.tenantIsolation('Domain', tenantId, existing.tenantId)
        );
      }

      return Result.err(
        DbError.notFound('Domain', `${normalizedName} (tenant: ${tenantId})`)
      );
    }

    return Result.ok(domain);
  }

  /**
   * Create a domain with validation
   */
  async createResult(data: NewDomain): Promise<ResultOrError<Domain, DbError>> {
    // Validate required fields
    if (!data.name) {
      return Result.err(
        new DbError({
          message: 'Domain name is required',
          code: 'CONSTRAINT_VIOLATION',
          table: 'Domain',
          operation: 'create',
        })
      );
    }

    // Check for duplicates within tenant
    if (data.tenantId) {
      const existing = await this.repo.findByNameAndTenant(
        data.name,
        data.tenantId
      );
      if (existing) {
        return Result.err(
          DbError.alreadyExists('Domain', `${data.name} (tenant: ${data.tenantId})`)
        );
      }
    }

    return dbResult(() => this.repo.create(data), (e) =>
      new DbError({
        message: e instanceof Error ? e.message : 'Failed to create domain',
        code: 'QUERY_FAILED',
        table: 'Domain',
        operation: 'create',
      })
    );
  }

  /**
   * Find or create a domain with Result
   */
  async findOrCreateResult(
    data: NewDomain
  ): Promise<ResultOrError<Domain, DbError>> {
    return dbResult(() => this.repo.findOrCreate(data), (e) =>
      new DbError({
        message: e instanceof Error ? e.message : 'Failed to find or create domain',
        code: 'QUERY_FAILED',
        table: 'Domain',
        operation: 'findOrCreate',
      })
    );
  }

  /**
   * Update a domain by ID
   */
  async updateResult(
    id: string,
    data: Partial<NewDomain>
  ): Promise<ResultOrError<Domain, DbError>> {
    // First check if domain exists
    const existing = await this.repo.findById(id);
    if (!existing) {
      return Result.err(DbError.notFound('Domain', id));
    }

    return dbResultOrNotFound(
      () => this.repo.update(id, data),
      'Domain',
      id
    );
  }

  /**
   * Update domain with tenant isolation
   */
  async updateForTenantResult(
    id: string,
    data: Partial<NewDomain>,
    tenantId: string
  ): Promise<ResultOrError<Domain, DbError>> {
    // Find and verify tenant
    const findResult = await this.findByIdResult(id);
    if (findResult.isErr()) {
      return findResult;
    }

    const isolationResult = ensureTenantIsolation(
      findResult.value,
      findResult.value.tenantId,
      tenantId,
      'Domain'
    );

    if (isolationResult.isErr()) {
      return isolationResult;
    }

    return dbResultOrNotFound(
      () => this.repo.update(id, data),
      'Domain',
      id
    );
  }

  /**
   * Delete a domain by ID
   */
  async deleteResult(id: string): Promise<ResultOrError<Domain, DbError>> {
    return dbResultOrNotFound(() => this.repo.delete(id), 'Domain', id);
  }

  /**
   * Delete a domain with tenant isolation
   */
  async deleteForTenantResult(
    id: string,
    tenantId: string
  ): Promise<ResultOrError<Domain, DbError>> {
    // Find and verify tenant
    const findResult = await this.findByIdResult(id);
    if (findResult.isErr()) {
      return findResult;
    }

    const isolationResult = ensureTenantIsolation(
      findResult.value,
      findResult.value.tenantId,
      tenantId,
      'Domain'
    );

    if (isolationResult.isErr()) {
      return isolationResult;
    }

    return dbResultOrNotFound(() => this.repo.delete(id), 'Domain', id);
  }

  /**
   * Search domains with Result
   */
  async searchByNameResult(
    pattern: string,
    limit?: number
  ): Promise<ResultOrError<Domain[], DbError>> {
    return dbResult(() => this.repo.searchByName(pattern, limit), (e) =>
      new DbError({
        message: e instanceof Error ? e.message : 'Search failed',
        code: 'QUERY_FAILED',
        table: 'Domain',
        operation: 'search',
      })
    );
  }

  /**
   * Find all domains matching filter
   */
  async findAllResult(
    filter?: DomainFilter,
    options?: { limit?: number; offset?: number }
  ): Promise<ResultOrError<Domain[], DbError>> {
    return dbResult(() => this.repo.findAll(filter, options), (e) =>
      new DbError({
        message: e instanceof Error ? e.message : 'Find all failed',
        code: 'QUERY_FAILED',
        table: 'Domain',
        operation: 'findAll',
      })
    );
  }
}

/**
 * Extend DomainRepository with Result-based methods
 *
 * Usage:
 * ```typescript
 * const repo = new DomainRepository(db);
 * const results = withDomainResults(repo);
 *
 * const result = await results.findByIdResult('id');
 * ```
 */
export function withDomainResults(repo: DomainRepository): DomainRepositoryResults {
  return new DomainRepositoryResults(repo);
}
