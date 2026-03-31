/**
 * Database Repository Result Types
 *
 * Result-based error handling for database operations.
 * Provides structured errors for common database failure modes.
 */

import {
  DatabaseError,
  NotFoundError,
  Result,
  TaggedError,
  type ResultOrError,
  TenantIsolationError,
} from '@dns-ops/contracts';

// Re-export for convenience
export { Result, type ResultOrError } from '@dns-ops/contracts';

/**
 * Database error codes for specific failure scenarios
 */
export type DbErrorCode =
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'TENANT_ISOLATION'
  | 'CONSTRAINT_VIOLATION'
  | 'QUERY_FAILED'
  | 'CONNECTION_ERROR'
  | 'TIMEOUT';

/**
 * Structured database error with context
 * Uses TaggedError for consistent error handling
 */
const DbError_base = TaggedError('DbError')<{
  message: string;
  code: DbErrorCode;
  table?: string;
  operation?: string;
  identifier?: string;
  tenantId?: string;
  resourceTenantId?: string;
}>();

export class DbError extends DbError_base {
  /**
   * Create a NOT_FOUND error
   */
  static notFound(table: string, identifier: string): DbError {
    return new DbError({
      message: `${table} not found: ${identifier}`,
      code: 'NOT_FOUND',
      table,
      identifier,
    });
  }

  /**
   * Create a TENANT_ISOLATION error
   */
  static tenantIsolation(
    table: string,
    tenantId: string,
    resourceTenantId?: string
  ): DbError {
    return new DbError({
      message: `Cross-tenant access denied for ${table}`,
      code: 'TENANT_ISOLATION',
      table,
      tenantId,
      resourceTenantId,
    });
  }

  /**
   * Create an ALREADY_EXISTS error
   */
  static alreadyExists(table: string, identifier: string): DbError {
    return new DbError({
      message: `${table} already exists: ${identifier}`,
      code: 'ALREADY_EXISTS',
      table,
      identifier,
    });
  }
}

/**
 * Type guard for DbError
 */
export function isDbError(error: unknown): error is DbError {
  return error instanceof DbError;
}

/**
 * Wrap a database operation in a Result
 *
 * @example
 * ```typescript
 * const result = await dbResult(() => repo.findById(id));
 * if (result.isOk()) {
 *   console.log(result.value);
 * }
 * ```
 */
export async function dbResult<T>(
  operation: () => Promise<T>,
  errorMapper?: (e: unknown) => DbError
): Promise<ResultOrError<T, DbError>> {
  try {
    const value = await operation();
    return Result.ok(value);
  } catch (e) {
    const error =
      errorMapper ??
      ((cause) =>
        new DbError({
          message: cause instanceof Error ? cause.message : String(cause),
          code: 'QUERY_FAILED',
        }));
    return Result.err(error(e));
  }
}

/**
 * Wrap a database operation that should return a value or NotFound
 *
 * @example
 * ```typescript
 * const result = await dbResultOrNotFound(
 *   () => repo.findById(id),
 *   'Domain',
 *   id
 * );
 * ```
 */
export async function dbResultOrNotFound<T>(
  operation: () => Promise<T | undefined | null>,
  table: string,
  identifier: string
): Promise<ResultOrError<T, DbError>> {
  try {
    const value = await operation();
    if (value === undefined || value === null) {
      return Result.err(DbError.notFound(table, identifier));
    }
    return Result.ok(value);
  } catch (e) {
    return Result.err(
      new DbError({
        message: e instanceof Error ? e.message : String(e),
        code: 'QUERY_FAILED',
        table,
        identifier,
      })
    );
  }
}

/**
 * Ensure tenant isolation for a resource
 *
 * @example
 * ```typescript
 * const result = ensureTenantIsolation(
 *   resource,
 *   resource.tenantId,
 *   currentTenantId,
 *   'Domain'
 * );
 * ```
 */
export function ensureTenantIsolation<T extends { tenantId?: string | null }>(
  resource: T | undefined,
  resourceTenantId: string | undefined | null,
  currentTenantId: string,
  table: string
): ResultOrError<T, DbError> {
  if (!resource) {
    return Result.err(
      new DbError({
        message: `${table} not found`,
        code: 'NOT_FOUND',
        table,
      })
    );
  }

  // If resource has no tenant, it's public
  if (!resourceTenantId) {
    return Result.ok(resource);
  }

  // Check tenant match
  if (resourceTenantId !== currentTenantId) {
    return Result.err(
      DbError.tenantIsolation(table, currentTenantId, resourceTenantId)
    );
  }

  return Result.ok(resource);
}

/**
 * Partition database results into successes and failures
 */
export function partitionDbResults<T>(
  results: ResultOrError<T, DbError>[]
): { ok: T[]; err: DbError[] } {
  const [ok, err] = Result.partition(results);
  return { ok, err };
}

/**
 * Unwrap a database result or return a default
 */
export function unwrapDbResultOr<T>(
  result: ResultOrError<T, DbError>,
  defaultValue: T
): T {
  return Result.unwrapOr(result, defaultValue);
}

/**
 * Convert a DbError to a NotFoundError (for API responses)
 */
export function toNotFoundError(dbError: DbError): NotFoundError {
  return new NotFoundError({
    message: dbError.message,
    resourceType: dbError.table,
    identifier: dbError.identifier ?? '',
  });
}

/**
 * Convert a DbError to a TenantIsolationError (for API responses)
 */
export function toTenantIsolationError(dbError: DbError): TenantIsolationError {
  return new TenantIsolationError({
    message: dbError.message,
    tenantId: dbError.tenantId ?? '',
    resourceTenantId: dbError.resourceTenantId,
  });
}
