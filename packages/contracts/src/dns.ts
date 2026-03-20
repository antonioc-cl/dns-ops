/**
 * DNS Constants and Utilities - Bead dns-ops-1j4.5.4
 *
 * Standardized DNS response codes and status mapping for consistent
 * error handling across the collector and database.
 */

import type { CollectionStatus } from './enums.js';

/**
 * DNS Response Codes (RCODE) per RFC 1035 and updates
 * https://www.iana.org/assignments/dns-parameters/dns-parameters.xhtml#dns-parameters-6
 */
export const DNS_RCODE = {
  NOERROR: 0, // No error - successful response
  FORMERR: 1, // Format error - server couldn't interpret query
  SERVFAIL: 2, // Server failure - problem with nameserver
  NXDOMAIN: 3, // Non-existent domain
  NOTIMP: 4, // Not implemented - query type not supported
  REFUSED: 5, // Query refused - policy restriction
  // Extended RCODEs (6-15 reserved for future use)
} as const;

export type DnsRcode = (typeof DNS_RCODE)[keyof typeof DNS_RCODE];

/**
 * Map DNS response code to CollectionStatus
 */
export function rcodeToStatus(rcode: number): CollectionStatus {
  switch (rcode) {
    case DNS_RCODE.NOERROR:
      return 'success';
    case DNS_RCODE.NXDOMAIN:
      return 'nxdomain';
    case DNS_RCODE.REFUSED:
      return 'refused';
    case DNS_RCODE.SERVFAIL:
    case DNS_RCODE.FORMERR:
    case DNS_RCODE.NOTIMP:
    default:
      return 'error';
  }
}

/**
 * Map error message patterns to CollectionStatus
 * Used when we don't have a clean RCODE from the DNS library
 */
export function errorToStatus(error: string | undefined): CollectionStatus {
  if (!error) return 'error';

  const errorLower = error.toLowerCase();

  // Timeout patterns
  if (
    errorLower.includes('timeout') ||
    errorLower.includes('etimedout') ||
    errorLower.includes('timed out')
  ) {
    return 'timeout';
  }

  // NXDOMAIN patterns
  if (
    errorLower.includes('enotfound') ||
    errorLower.includes('nxdomain') ||
    errorLower.includes('name does not exist')
  ) {
    return 'nxdomain';
  }

  // Refused patterns
  if (
    errorLower.includes('econnrefused') ||
    errorLower.includes('refused') ||
    errorLower.includes('eacces')
  ) {
    return 'refused';
  }

  // Truncation patterns
  if (errorLower.includes('truncated') || errorLower.includes('tc flag')) {
    return 'truncated';
  }

  return 'error';
}

/**
 * Determine if a successful response with no answers is NODATA
 * NODATA: Name exists, but no records of the requested type
 */
export function isNoData(
  success: boolean,
  answersLength: number,
  rcode: number | undefined
): boolean {
  // NODATA is: successful query (NOERROR), name exists, but no records
  return success && answersLength === 0 && (rcode === undefined || rcode === DNS_RCODE.NOERROR);
}

/**
 * Comprehensive status determination from query result
 */
export function determineStatus(params: {
  success: boolean;
  rcode?: number;
  error?: string;
  answerCount: number;
  truncated?: boolean;
}): CollectionStatus {
  const { success, rcode, error, answerCount, truncated } = params;

  // Truncation takes priority - we got data but it's incomplete
  if (truncated) {
    return 'truncated';
  }

  // Success path
  if (success) {
    // NODATA: success but no answers
    if (answerCount === 0) {
      return 'nodata';
    }
    return 'success';
  }

  // Error path - try RCODE first
  if (rcode !== undefined) {
    return rcodeToStatus(rcode);
  }

  // Fall back to error message parsing
  return errorToStatus(error);
}

/**
 * Map CollectionStatus to human-readable description
 */
export const STATUS_DESCRIPTIONS: Record<CollectionStatus, string> = {
  success: 'Query successful, records retrieved',
  timeout: 'Query timed out waiting for response',
  refused: 'Query refused by nameserver',
  truncated: 'Response truncated (TC flag set)',
  nxdomain: 'Domain name does not exist',
  nodata: 'Domain exists but no records of this type',
  error: 'Query failed with an error',
};

/**
 * DNS Error categories for error aggregation
 */
export type DnsErrorCategory = 'network' | 'dns-protocol' | 'nameserver' | 'client';

/**
 * Categorize error for reporting
 */
export function categorizeError(status: CollectionStatus): DnsErrorCategory {
  switch (status) {
    case 'timeout':
      return 'network';
    case 'refused':
      return 'nameserver';
    case 'nxdomain':
    case 'nodata':
    case 'truncated':
      return 'dns-protocol';
    case 'error':
    default:
      return 'client';
  }
}
