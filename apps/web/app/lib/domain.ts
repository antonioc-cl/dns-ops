/**
 * Domain normalization utilities
 *
 * This module re-exports from @dns-ops/parsing for consistency.
 * DX-004: Consolidated domain validation to single canonical implementation.
 */

import {
  DomainNormalizationError,
  isPunycode,
  isValidDomain,
  type NormalizedDomain,
  normalizeDomain,
} from '@dns-ops/parsing';

export type { NormalizedDomain };
export { DomainNormalizationError, isPunycode, isValidDomain, normalizeDomain };

/**
 * DomainValidationError - re-exported for backwards compatibility
 *
 * @deprecated Use DomainNormalizationError from @dns-ops/parsing instead
 */
export class DomainValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainValidationError';
  }
}

/**
 * Extract display name from punycode domain
 * Shows unicode version if domain is IDN
 */
export function getDisplayDomain(domain: string): string {
  try {
    // URL API converts punycode back to unicode for display
    const url = new URL(`http://${domain}`);
    // Get hostname without port
    return url.hostname;
  } catch {
    return domain;
  }
}
