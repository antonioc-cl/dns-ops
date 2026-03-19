/**
 * Probe Destination Allowlist - Bead 10
 *
 * Ensures probes only target destinations derived from DNS results.
 * Prevents arbitrary outbound probing.
 */
import type { DNSQueryResult } from '../dns/types';
export interface AllowlistEntry {
    type: 'mx' | 'mta-sts' | 'smtp' | 'custom';
    hostname: string;
    port?: number;
    derivedFrom: {
        domain: string;
        queryType: string;
        queryName: string;
        answerData: string;
    };
    expiresAt: Date;
}
export declare class ProbeAllowlist {
    private entries;
    private readonly defaultTtlMs;
    constructor(defaultTtlMs?: number);
    /**
     * Generate allowlist entries from DNS query results
     * Extracts MX hosts and MTA-STS endpoints
     */
    generateFromDnsResults(domain: string, dnsResults: DNSQueryResult[]): AllowlistEntry[];
    /**
     * Add a custom allowlist entry (for operator-specified probes)
     * Requires explicit approval
     */
    addCustomEntry(hostname: string, port: number, requestedBy: string, reason: string): AllowlistEntry;
    /**
     * Check if a destination is in the allowlist
     */
    isAllowed(hostname: string, port?: number): boolean;
    /**
     * Get allowlist entry for a destination
     */
    getEntry(hostname: string, port?: number): AllowlistEntry | undefined;
    /**
     * Get all active allowlist entries
     */
    getAllEntries(): AllowlistEntry[];
    /**
     * Remove expired entries
     */
    private cleanup;
    /**
     * Generate key for allowlist map
     */
    private key;
    /**
     * Clear all entries
     */
    clear(): void;
}
export declare const probeAllowlist: ProbeAllowlist;
//# sourceMappingURL=allowlist.d.ts.map