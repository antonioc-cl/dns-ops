/**
 * DNS Response Parsing
 *
 * Parse and normalize DNS responses into structured formats.
 */
import type { DNSRecord } from '@dns-ops/db/schema';
export interface ParsedAnswer {
    name: string;
    type: string;
    ttl: number;
    data: string;
    priority?: number;
}
/**
 * Parse raw DNS answer data into structured format
 */
export declare function parseDNSAnswer(record: DNSRecord): ParsedAnswer;
/**
 * Parse TXT record data, handling multiple strings
 */
export declare function parseTXTRecord(data: string): string[];
/**
 * Normalize a domain name (lowercase, remove trailing dot)
 */
export declare function normalizeDomain(name: string): string;
/**
 * Check if a name is a wildcard
 */
export declare function isWildcard(name: string): boolean;
/**
 * Extract the wildcard base (e.g., *.example.com -> example.com)
 */
export declare function getWildcardBase(name: string): string;
//# sourceMappingURL=index.d.ts.map