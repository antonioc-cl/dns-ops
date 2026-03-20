/**
 * Probe Destination Allowlist - Bead 10
 *
 * Ensures probes only target destinations derived from DNS results.
 * Prevents arbitrary outbound probing.
 */

import type { DNSQueryResult } from '../dns/types.js';

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

export class ProbeAllowlist {
  private entries: Map<string, AllowlistEntry> = new Map();
  private readonly defaultTtlMs: number;

  constructor(defaultTtlMs = 5 * 60 * 1000) {
    // 5 minute default TTL
    this.defaultTtlMs = defaultTtlMs;
  }

  /**
   * Generate allowlist entries from DNS query results
   * Extracts MX hosts and MTA-STS endpoints
   */
  generateFromDnsResults(domain: string, dnsResults: DNSQueryResult[]): AllowlistEntry[] {
    const entries: AllowlistEntry[] = [];
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.defaultTtlMs);

    for (const result of dnsResults) {
      if (!result.success) continue;

      // Extract MX hosts
      if (result.query.type === 'MX') {
        for (const answer of result.answers) {
          // MX format: "priority hostname"
          const parts = answer.data.trim().split(/\s+/);
          if (parts.length >= 2) {
            const hostname = parts[1].replace(/\.$/, ''); // Remove trailing dot
            const entry: AllowlistEntry = {
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

      // Extract MTA-STS policy host
      if (result.query.type === 'TXT' && result.query.name.includes('_mta-sts')) {
        // MTA-STS policy is at https://mta-sts.{domain}/.well-known/mta-sts.txt
        const entry: AllowlistEntry = {
          type: 'mta-sts',
          hostname: `mta-sts.${domain}`,
          port: 443,
          derivedFrom: {
            domain,
            queryType: result.query.type,
            queryName: result.query.name,
            answerData: result.answers.map((a: { data: string }) => a.data).join(', '),
          },
          expiresAt,
        };
        entries.push(entry);
        this.entries.set(this.key(entry), entry);
      }
    }

    return entries;
  }

  /**
   * Add a custom allowlist entry (for operator-specified probes)
   * Requires explicit approval
   */
  addCustomEntry(
    hostname: string,
    port: number,
    requestedBy: string,
    reason: string
  ): AllowlistEntry {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.defaultTtlMs);

    const entry: AllowlistEntry = {
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

  /**
   * Check if a destination is in the allowlist
   */
  isAllowed(hostname: string, port?: number): boolean {
    this.cleanup();

    // Check for exact match
    const key = port ? `${hostname}:${port}` : hostname;
    if (this.entries.has(key)) {
      return true;
    }

    // Check for hostname match (any port)
    for (const entry of this.entries.values()) {
      if (entry.hostname === hostname) {
        if (port === undefined || entry.port === undefined || entry.port === port) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get allowlist entry for a destination
   */
  getEntry(hostname: string, port?: number): AllowlistEntry | undefined {
    this.cleanup();

    const key = port ? `${hostname}:${port}` : hostname;
    return this.entries.get(key);
  }

  /**
   * Get all active allowlist entries
   */
  getAllEntries(): AllowlistEntry[] {
    this.cleanup();
    return Array.from(this.entries.values());
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = new Date();
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt < now) {
        this.entries.delete(key);
      }
    }
  }

  /**
   * Generate key for allowlist map
   */
  private key(entry: AllowlistEntry): string {
    return entry.port ? `${entry.hostname}:${entry.port}` : entry.hostname;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries.clear();
  }
}

// Global allowlist instance
export const probeAllowlist = new ProbeAllowlist();
