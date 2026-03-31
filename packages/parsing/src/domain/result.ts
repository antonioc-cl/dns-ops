/**
 * Domain Normalization with Result Types
 *
 * Result-based variants of domain normalization functions.
 * These complement the throwing versions for gradual migration.
 */

import { Result, type ResultOrError, ValidationError } from '@dns-ops/contracts';
import {
  DomainNormalizationError,
  type NormalizedDomain,
  normalizeDomain,
  tryNormalizeDomain,
} from './index.js';

/**
 * Domain validation error codes
 */
export type DomainValidationCode =
  | 'EMPTY_DOMAIN'
  | 'DOMAIN_TOO_LONG'
  | 'LABEL_TOO_LONG'
  | 'INVALID_CHARACTERS'
  | 'INVALID_FORMAT'
  | 'DOUBLE_DOT';

/**
 * Domain validation error with structured details
 */
export class DomainValidationError extends ValidationError {
  readonly code: DomainValidationCode;

  constructor(args: {
    message: string;
    code: DomainValidationCode;
    domain?: string;
    field?: string;
    details?: Record<string, unknown>;
  }) {
    super({
      message: args.message,
      field: args.field ?? 'domain',
      details: { code: args.code, domain: args.domain, ...args.details },
    });
    this.code = args.code;
  }

  /**
   * Convert from legacy DomainNormalizationError
   */
  static fromLegacy(error: DomainNormalizationError, domain?: string): DomainValidationError {
    return new DomainValidationError({
      message: error.message,
      code: error.code,
      domain,
    });
  }
}

/**
 * Normalize a domain name, returning a Result instead of throwing.
 *
 * @example
 * ```typescript
 * const result = normalizeDomainResult('Example.COM');
 *
 * if (result.isOk()) {
 *   console.log(result.value.normalized); // 'example.com'
 * } else {
 *   console.error(result.error.details?.code); // 'INVALID_FORMAT'
 * }
 *
 * // Or with pattern matching:
 * const message = Result.match(result, {
 *   ok: (d) => `Normalized: ${d.normalized}`,
 *   err: (e) => `Failed: ${e.message}`,
 * });
 * ```
 */
export function normalizeDomainResult(
  name: string
): ResultOrError<NormalizedDomain, DomainValidationError> {
  return Result.try({
    try: () => normalizeDomain(name),
    catch: (e) => {
      if (e instanceof DomainNormalizationError) {
        return DomainValidationError.fromLegacy(e, name);
      }
      return new DomainValidationError({
        message: e instanceof Error ? e.message : String(e),
        code: 'INVALID_FORMAT',
        domain: name,
      });
    },
  });
}

/**
 * Normalize a domain name asynchronously.
 * Useful for async pipelines where consistency matters.
 */
export async function normalizeDomainResultAsync(
  name: string
): Promise<ResultOrError<NormalizedDomain, DomainValidationError>> {
  // Normalize synchronously but wrap in Promise for async pipelines
  return normalizeDomainResult(name);
}

/**
 * Type guard for DomainValidationError
 */
export function isDomainValidationError(error: unknown): error is DomainValidationError {
  return error instanceof DomainValidationError;
}

/**
 * Convert legacy tryNormalizeDomain to Result type
 *
 * @deprecated Use normalizeDomainResult instead
 */
export function tryNormalizeDomainResult(
  name: string
): ResultOrError<NormalizedDomain, DomainValidationError> {
  const result = tryNormalizeDomain(name);
  if (result === null) {
    return Result.err(
      new DomainValidationError({
        message: 'Domain normalization failed',
        code: 'INVALID_FORMAT',
        domain: name,
      })
    );
  }
  return Result.ok(result);
}

/**
 * Batch normalize multiple domains with Result types
 *
 * @example
 * ```typescript
 * const domains = ['example.com', 'EXAMPLE.ORG', 'invalid..domain'];
 * const results = normalizeDomainsResult(domains);
 *
 * const successful = results.filter(r => r.isOk()).map(r => r.value);
 * const failed = results.filter(r => r.isErr()).map(r => r.error);
 * ```
 */
export function normalizeDomainsResult(
  names: string[]
): ResultOrError<NormalizedDomain, DomainValidationError>[] {
  return names.map(normalizeDomainResult);
}

/**
 * Partition results into successes and failures
 *
 * @example
 * ```typescript
 * const { ok, err } = partitionDomainResults(domains);
 * // ok: NormalizedDomain[]
 * // err: DomainValidationError[]
 * ```
 */
export function partitionDomainResults(names: string[]): {
  ok: NormalizedDomain[];
  err: DomainValidationError[];
} {
  const results = normalizeDomainsResult(names);
  const [ok, err] = Result.partition(results);
  return { ok, err };
}
