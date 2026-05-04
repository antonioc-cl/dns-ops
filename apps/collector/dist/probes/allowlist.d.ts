/**
 * Probe Destination Allowlist - Bead 10 / AUTH-003
 *
 * Ensures probes only target destinations derived from DNS results.
 * Prevents arbitrary outbound probing.
 *
 * TENANT ISOLATION: Each tenant has isolated allowlist entries.
 * All operations are scoped by tenantId.
 */
import type { DNSQueryResult } from '../dns/types.js';
export interface AllowlistEntry {
    tenantId: string;
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
export interface TenantScopedAllowlist {
    /**
     * Generate allowlist entries from DNS query results for this tenant
     */
    generateFromDnsResults(domain: string, dnsResults: DNSQueryResult[]): AllowlistEntry[];
    /**
     * Add a custom allowlist entry for this tenant
     */
    addCustomEntry(hostname: string, port: number, requestedBy: string, reason: string): AllowlistEntry;
    /**
     * Check if a destination is allowed for this tenant
     */
    isAllowed(hostname: string, port?: number): boolean;
    /**
     * Get allowlist entry for a destination
     */
    getEntry(hostname: string, port?: number): AllowlistEntry | undefined;
    /**
     * Get all active allowlist entries for this tenant
     */
    getAllEntries(): AllowlistEntry[];
    /**
     * Clear all entries for this tenant
     */
    clear(): void;
}
/**
 * Create a tenant-scoped allowlist instance
 */
export declare function createTenantAllowlist(tenantId: string): TenantScopedAllowlist;
/**
 * Tenant-aware allowlist manager
 * Manages allowlists across all tenants
 */
export declare class ProbeAllowlistManager {
    private tenantAllowlists;
    /**
     * Get or create a tenant-scoped allowlist
     */
    getTenantAllowlist(tenantId: string): TenantScopedAllowlist;
    /**
     * Check if a destination is allowed for a specific tenant
     */
    isAllowed(tenantId: string, hostname: string, port?: number): boolean;
    /**
     * Clear all allowlists (use with caution)
     */
    clearAll(): void;
    /**
     * Clear a specific tenant's allowlist
     */
    clearTenant(tenantId: string): void;
    /**
     * Get all active tenants with allowlists
     */
    getActiveTenants(): string[];
}
export declare const probeAllowlistManager: ProbeAllowlistManager;
/**
 * Legacy compatibility: Global allowlist instance
 * DEPRECATED: Use probeAllowlistManager.getTenantAllowlist(tenantId) instead
 *
 * @deprecated Use TenantScopedAllowlist for new code
 */
export declare class ProbeAllowlist {
    private entries;
    private readonly defaultTtlMs;
    constructor(defaultTtlMs?: number);
    generateFromDnsResults(domain: string, dnsResults: DNSQueryResult[]): AllowlistEntry[];
    addCustomEntry(hostname: string, port: number, requestedBy: string, reason: string): AllowlistEntry;
    isAllowed(hostname: string, port?: number): boolean;
    getEntry(hostname: string, port?: number): AllowlistEntry | undefined;
    getAllEntries(): AllowlistEntry[];
    private cleanup;
    private key;
    clear(): void;
}
export declare const probeAllowlist: ProbeAllowlist;
//# sourceMappingURL=allowlist.d.ts.map