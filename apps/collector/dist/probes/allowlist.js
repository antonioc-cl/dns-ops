/**
 * Probe Destination Allowlist - Bead 10 / AUTH-003
 *
 * Ensures probes only target destinations derived from DNS results.
 * Prevents arbitrary outbound probing.
 *
 * TENANT ISOLATION: Each tenant has isolated allowlist entries.
 * All operations are scoped by tenantId.
 */
/**
 * Create a tenant-scoped allowlist instance
 */
export function createTenantAllowlist(tenantId) {
    const entries = new Map();
    const defaultTtlMs = 5 * 60 * 1000; // 5 minute default TTL
    function key(entry) {
        return entry.port ? `${entry.hostname}:${entry.port}` : entry.hostname;
    }
    function cleanup() {
        const now = new Date();
        for (const [k, entry] of entries) {
            if (entry.expiresAt < now) {
                entries.delete(k);
            }
        }
    }
    return {
        generateFromDnsResults(domain, dnsResults) {
            const resultEntries = [];
            const now = new Date();
            const expiresAt = new Date(now.getTime() + defaultTtlMs);
            for (const dnsResult of dnsResults) {
                if (!dnsResult.success)
                    continue;
                // Extract MX hosts
                if (dnsResult.query.type === 'MX') {
                    for (const answer of dnsResult.answers) {
                        const parts = answer.data.trim().split(/\s+/);
                        if (parts.length >= 2) {
                            const hostname = parts[1].replace(/\.$/, '');
                            const entry = {
                                tenantId,
                                type: 'mx',
                                hostname,
                                port: 25,
                                derivedFrom: {
                                    domain,
                                    queryType: dnsResult.query.type,
                                    queryName: dnsResult.query.name,
                                    answerData: answer.data,
                                },
                                expiresAt,
                            };
                            resultEntries.push(entry);
                            entries.set(key(entry), entry);
                        }
                    }
                }
                // Extract MTA-STS policy host
                if (dnsResult.query.type === 'TXT' && dnsResult.query.name.includes('_mta-sts')) {
                    const entry = {
                        tenantId,
                        type: 'mta-sts',
                        hostname: `mta-sts.${domain}`,
                        port: 443,
                        derivedFrom: {
                            domain,
                            queryType: dnsResult.query.type,
                            queryName: dnsResult.query.name,
                            answerData: dnsResult.answers.map((a) => a.data).join(', '),
                        },
                        expiresAt,
                    };
                    resultEntries.push(entry);
                    entries.set(key(entry), entry);
                }
            }
            return resultEntries;
        },
        addCustomEntry(hostname, port, requestedBy, reason) {
            const now = new Date();
            const expiresAt = new Date(now.getTime() + defaultTtlMs);
            const entry = {
                tenantId,
                type: 'custom',
                hostname,
                port,
                derivedFrom: {
                    domain: 'custom',
                    queryType: 'manual',
                    queryName: hostname,
                    answerData: `Requested by ${requestedBy}: ${reason}`,
                },
                expiresAt,
            };
            entries.set(key(entry), entry);
            return entry;
        },
        isAllowed(hostname, port) {
            cleanup();
            const entryKey = port ? `${hostname}:${port}` : hostname;
            if (entries.has(entryKey)) {
                return true;
            }
            for (const entry of entries.values()) {
                if (entry.hostname === hostname) {
                    if (port === undefined || entry.port === undefined || entry.port === port) {
                        return true;
                    }
                }
            }
            return false;
        },
        getEntry(hostname, port) {
            cleanup();
            const entryKey = port ? `${hostname}:${port}` : hostname;
            return entries.get(entryKey);
        },
        getAllEntries() {
            cleanup();
            return Array.from(entries.values());
        },
        clear() {
            entries.clear();
        },
    };
}
/**
 * Tenant-aware allowlist manager
 * Manages allowlists across all tenants
 */
export class ProbeAllowlistManager {
    tenantAllowlists = new Map();
    /**
     * Get or create a tenant-scoped allowlist
     */
    getTenantAllowlist(tenantId) {
        let allowlist = this.tenantAllowlists.get(tenantId);
        if (!allowlist) {
            allowlist = createTenantAllowlist(tenantId);
            this.tenantAllowlists.set(tenantId, allowlist);
        }
        return allowlist;
    }
    /**
     * Check if a destination is allowed for a specific tenant
     */
    isAllowed(tenantId, hostname, port) {
        return this.getTenantAllowlist(tenantId).isAllowed(hostname, port);
    }
    /**
     * Clear all allowlists (use with caution)
     */
    clearAll() {
        this.tenantAllowlists.clear();
    }
    /**
     * Clear a specific tenant's allowlist
     */
    clearTenant(tenantId) {
        this.tenantAllowlists.delete(tenantId);
    }
    /**
     * Get all active tenants with allowlists
     */
    getActiveTenants() {
        return Array.from(this.tenantAllowlists.keys());
    }
}
// Global manager instance
export const probeAllowlistManager = new ProbeAllowlistManager();
/**
 * Legacy compatibility: Global allowlist instance
 * DEPRECATED: Use probeAllowlistManager.getTenantAllowlist(tenantId) instead
 *
 * @deprecated Use TenantScopedAllowlist for new code
 */
export class ProbeAllowlist {
    entries = new Map();
    defaultTtlMs;
    constructor(defaultTtlMs = 5 * 60 * 1000) {
        this.defaultTtlMs = defaultTtlMs;
    }
    generateFromDnsResults(domain, dnsResults) {
        const entries = [];
        const now = new Date();
        const expiresAt = new Date(now.getTime() + this.defaultTtlMs);
        for (const result of dnsResults) {
            if (!result.success)
                continue;
            if (result.query.type === 'MX') {
                for (const answer of result.answers) {
                    const parts = answer.data.trim().split(/\s+/);
                    if (parts.length >= 2) {
                        const hostname = parts[1].replace(/\.$/, '');
                        const entry = {
                            tenantId: 'default', // Legacy entries are tenant-scoped
                            type: 'mx',
                            hostname,
                            port: 25,
                            derivedFrom: {
                                domain,
                                queryType: result.query.type,
                                queryName: result.query.name,
                                answerData: answer.data,
                            },
                            expiresAt,
                        };
                        entries.push(entry);
                        this.entries.set(this.key(entry), entry);
                    }
                }
            }
            if (result.query.type === 'TXT' && result.query.name.includes('_mta-sts')) {
                const entry = {
                    tenantId: 'default',
                    type: 'mta-sts',
                    hostname: `mta-sts.${domain}`,
                    port: 443,
                    derivedFrom: {
                        domain,
                        queryType: result.query.type,
                        queryName: result.query.name,
                        answerData: result.answers.map((a) => a.data).join(', '),
                    },
                    expiresAt,
                };
                entries.push(entry);
                this.entries.set(this.key(entry), entry);
            }
        }
        return entries;
    }
    addCustomEntry(hostname, port, requestedBy, reason) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + this.defaultTtlMs);
        const entry = {
            tenantId: 'default',
            type: 'custom',
            hostname,
            port,
            derivedFrom: {
                domain: 'custom',
                queryType: 'manual',
                queryName: hostname,
                answerData: `Requested by ${requestedBy}: ${reason}`,
            },
            expiresAt,
        };
        this.entries.set(this.key(entry), entry);
        return entry;
    }
    isAllowed(hostname, port) {
        this.cleanup();
        const key = port ? `${hostname}:${port}` : hostname;
        if (this.entries.has(key)) {
            return true;
        }
        for (const entry of this.entries.values()) {
            if (entry.hostname === hostname) {
                if (port === undefined || entry.port === undefined || entry.port === port) {
                    return true;
                }
            }
        }
        return false;
    }
    getEntry(hostname, port) {
        this.cleanup();
        const key = port ? `${hostname}:${port}` : hostname;
        return this.entries.get(key);
    }
    getAllEntries() {
        this.cleanup();
        return Array.from(this.entries.values());
    }
    cleanup() {
        const now = new Date();
        for (const [key, entry] of this.entries) {
            if (entry.expiresAt < now) {
                this.entries.delete(key);
            }
        }
    }
    key(entry) {
        return entry.port ? `${entry.hostname}:${entry.port}` : entry.hostname;
    }
    clear() {
        this.entries.clear();
    }
}
// Global legacy instance
export const probeAllowlist = new ProbeAllowlist();
//# sourceMappingURL=allowlist.js.map