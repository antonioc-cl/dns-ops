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
export declare const DNS_RCODE: {
    readonly NOERROR: 0;
    readonly FORMERR: 1;
    readonly SERVFAIL: 2;
    readonly NXDOMAIN: 3;
    readonly NOTIMP: 4;
    readonly REFUSED: 5;
};
export type DnsRcode = (typeof DNS_RCODE)[keyof typeof DNS_RCODE];
/**
 * Map DNS response code to CollectionStatus
 */
export declare function rcodeToStatus(rcode: number): CollectionStatus;
/**
 * Map error message patterns to CollectionStatus
 * Used when we don't have a clean RCODE from the DNS library
 */
export declare function errorToStatus(error: string | undefined): CollectionStatus;
/**
 * Determine if a successful response with no answers is NODATA
 * NODATA: Name exists, but no records of the requested type
 */
export declare function isNoData(success: boolean, answersLength: number, rcode: number | undefined): boolean;
/**
 * Comprehensive status determination from query result
 */
export declare function determineStatus(params: {
    success: boolean;
    rcode?: number;
    error?: string;
    answerCount: number;
    truncated?: boolean;
}): CollectionStatus;
/**
 * Map CollectionStatus to human-readable description
 */
export declare const STATUS_DESCRIPTIONS: Record<CollectionStatus, string>;
/**
 * DNS Error categories for error aggregation
 */
export type DnsErrorCategory = 'network' | 'dns-protocol' | 'nameserver' | 'client';
/**
 * Categorize error for reporting
 */
export declare function categorizeError(status: CollectionStatus): DnsErrorCategory;
//# sourceMappingURL=dns.d.ts.map