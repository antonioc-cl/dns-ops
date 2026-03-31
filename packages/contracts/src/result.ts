/**
 * DNS Ops Workbench - Result Types
 *
 * Shared Result types and error utilities using better-result.
 * This module provides the foundation for gradual migration from
 * exception-based error handling to explicit Result types.
 */

import { Result, TaggedError } from 'better-result';

// Re-export Result and TaggedError for convenience
export { Result, TaggedError } from 'better-result';

/**
 * Base error factory for all domain-specific errors.
 * Uses better-result's TaggedError for structured error handling.
 *
 * @example
 * class ValidationError extends DomainError("ValidationError")<{ field: string }>() {}
 * const err = new ValidationError({ field: "email", message: "Invalid email" });
 */
export function DomainError<Tag extends string>(tag: Tag) {
  return TaggedError(tag);
}

/**
 * Validation error - invalid input data
 */
const ValidationError_base = DomainError('ValidationError')<{
  message: string;
  field?: string;
  details?: Record<string, unknown>;
}>();

export class ValidationError extends ValidationError_base {
  readonly statusCode = 400;
}

/**
 * Not found error - resource doesn't exist
 */
const NotFoundError_base = DomainError('NotFoundError')<{
  message: string;
  resourceType?: string;
  identifier?: string;
}>();

export class NotFoundError extends NotFoundError_base {
  readonly statusCode = 404;
}

/**
 * Tenant isolation error - cross-tenant access attempt
 */
const TenantIsolationError_base = DomainError('TenantIsolationError')<{
  message: string;
  tenantId?: string;
  resourceTenantId?: string;
}>();

export class TenantIsolationError extends TenantIsolationError_base {
  readonly statusCode = 403;
}

/**
 * Database error - persistence layer failures
 */
const DatabaseError_base = DomainError('DatabaseError')<{
  message: string;
  operation?: string;
  table?: string;
}>();

export class DatabaseError extends DatabaseError_base {
  readonly statusCode = 500;
}

/**
 * Parse error - data parsing failures
 */
const ParseError_base = DomainError('ParseError')<{
  message: string;
  input?: string;
  format?: string;
}>();

export class ParseError extends ParseError_base {
  readonly statusCode = 400;
}

/**
 * Network error - DNS queries, HTTP requests, etc.
 */
const NetworkError_base = DomainError('NetworkError')<{
  message: string;
  endpoint?: string;
}>();

export class NetworkError extends NetworkError_base {
  readonly statusCode = 502;
}

/**
 * Type alias for common Result patterns
 */
export type ResultOrError<T, E = DomainErrorType> = Result<T, E>;
export type AsyncResult<T, E = DomainErrorType> = Promise<Result<T, E>>;

/**
 * Union of all domain errors for error handling
 */
export type DomainErrorType =
  | InstanceType<typeof ValidationError>
  | InstanceType<typeof NotFoundError>
  | InstanceType<typeof TenantIsolationError>
  | InstanceType<typeof DatabaseError>
  | InstanceType<typeof ParseError>
  | InstanceType<typeof NetworkError>;

/**
 * Helper to convert a throwing function to a Result
 * Usage: resultify(() => JSON.parse(str))
 */
export function resultify<T>(
  fn: () => T,
  errorMapper?: (e: unknown) => InstanceType<typeof ParseError>
): Result<T, InstanceType<typeof ParseError>> {
  try {
    return Result.ok(fn());
  } catch (e) {
    const error =
      errorMapper ??
      ((cause) =>
        new ParseError({
          message: cause instanceof Error ? cause.message : String(cause),
        }));
    return Result.err(error(e));
  }
}

/**
 * Helper to convert an async throwing function to a Result
 * Usage: await resultifyAsync(() => fetch(url))
 */
export async function resultifyAsync<T>(
  fn: () => Promise<T>,
  errorMapper?: (e: unknown) => DomainErrorType
): AsyncResult<T, DomainErrorType> {
  try {
    return Result.ok(await fn());
  } catch (e) {
    const error =
      errorMapper ??
      ((cause) =>
        new DatabaseError({
          message: cause instanceof Error ? cause.message : String(cause),
        }));
    return Result.err(error(e));
  }
}

/**
 * Unwrap a Result or return a default value
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return Result.unwrapOr(result, defaultValue);
}

/**
 * Extract all Ok values from an array of Results
 */
export function filterOk<T, E>(results: Result<T, E>[]): T[] {
  const [okValues] = Result.partition(results);
  return okValues;
}

/**
 * Extract all Err values from an array of Results
 */
export function filterErr<T, E>(results: Result<T, E>[]): E[] {
  const [, errValues] = Result.partition(results);
  return errValues;
}
