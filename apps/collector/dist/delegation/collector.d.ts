/**
 * Delegation Collection Module
 *
 * Collects delegation-related DNS data:
 * - Parent zone delegation view
 * - Per-authoritative-server answers
 * - Glue records
 * - DNSSEC observation fields
 * - Lame delegation detection
 */
import type { DNSAnswer, DNSQuery, DNSQueryResult } from '../dns/types.js';
export interface DelegationSummary {
    domain: string;
    parentZone: string;
    parentNs: DNSAnswer[];
    authoritativeResponses: AuthoritativeResponse[];
    glueRecords: DNSAnswer[];
    missingGlue: string[];
    hasDivergence: boolean;
    divergenceDetails: DivergenceDetail[];
    lameDelegations: LameDelegation[];
    dnssecInfo: DnssecInfo | null;
}
export interface AuthoritativeResponse {
    server: string;
    result: DNSQueryResult;
    responseTime: number;
}
/**
 * A group of servers that returned the same answers for a query
 */
export interface AnswerGroup {
    servers: string[];
    answers: DNSAnswer[];
    /** Sorted, comma-joined answer data for comparison */
    signature: string;
}
/**
 * Divergence detail for a specific query
 *
 * When servers disagree, groups contains 2+ entries showing which
 * servers returned which answers. The first group is typically the
 * majority/reference group.
 */
export interface DivergenceDetail {
    queryName: string;
    queryType: string;
    /** Groups of servers with matching answers - 2+ groups means divergence */
    groups: AnswerGroup[];
    /** Total number of servers that responded successfully */
    totalServers: number;
}
export interface LameDelegation {
    server: string;
    reason: 'not-authoritative' | 'timeout' | 'refused' | 'error';
    details?: string;
}
export interface DnssecInfo {
    hasRrsig: boolean;
    adFlagSet: boolean;
    dnskeyRecords: DNSAnswer[];
    dsRecords: DNSAnswer[];
    validatingSource: string;
}
export declare class DelegationCollector {
    private resolver;
    private domain;
    constructor(domain: string);
    /**
     * Extract parent zone from domain
     * example.com -> com
     * sub.example.com -> example.com
     * deep.sub.example.com -> sub.example.com
     */
    getParentZone(domain: string): string;
    /**
     * Collect delegation view from parent zone
     */
    collectParentDelegation(recursiveResolver: string): Promise<DNSQueryResult>;
    /**
     * Query each authoritative server individually
     */
    collectFromAuthoritativeServers(query: DNSQuery, nsServers: string[]): Promise<AuthoritativeResponse[]>;
    /**
     * Extract glue records from additional section
     */
    extractGlueRecords(result: DNSQueryResult): DNSAnswer[];
    /**
     * Detect missing glue when NS target is in-zone
     */
    detectMissingGlue(result: DNSQueryResult): string[];
    /**
     * Detect divergence in answers across authoritative servers
     *
     * Groups servers by their answer signatures and returns divergence details
     * when multiple groups exist for the same query.
     */
    detectDivergence(responses: AuthoritativeResponse[]): {
        hasDivergence: boolean;
        divergenceDetails: DivergenceDetail[];
    };
    /**
     * Detect lame delegation
     *
     * NOTE: Currently only reports failures (timeouts, refused, errors).
     * The "not-authoritative" detection is DISABLED because the Node.js
     * dns module doesn't expose the AA (Authoritative Answer) flag from
     * DNS responses. All queries report aa=false regardless of actual status.
     *
     * To enable true lame delegation detection, migrate to dns-packet
     * library which provides raw DNS response flags.
     *
     * See: docs/architecture/runtime-topology.md#authoritative-querying
     */
    detectLameDelegation(responses: AuthoritativeResponse[]): LameDelegation[];
    /**
     * Collect with DNSSEC flags
     */
    collectWithDnssec(name: string, type: string, recursiveResolver: string): Promise<DNSQueryResult>;
    /**
     * Collect DNSKEY records
     *
     * Uses dns-packet resolver (DNS-002) since Node.js native dns module
     * doesn't support DNSKEY queries.
     */
    collectDnskey(domain: string, recursiveResolver: string): Promise<DNSQueryResult>;
    /**
     * Collect DS records from parent zone
     *
     * Uses dns-packet resolver (DNS-002) since Node.js native dns module
     * doesn't support DS queries.
     */
    collectDsFromParent(domain: string, recursiveResolver: string): Promise<DNSQueryResult>;
    /**
     * Generate complete delegation summary
     */
    collectDelegationSummary(recursiveResolver: string): Promise<DelegationSummary>;
    /**
     * Collect DNSSEC information
     */
    private collectDnssecInfo;
    /**
     * Categorize failure reason
     */
    private categorizeFailure;
}
export type { DNSAnswer, DNSQueryResult, VantageInfo, } from '../dns/types.js';
//# sourceMappingURL=collector.d.ts.map