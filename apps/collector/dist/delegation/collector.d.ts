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
import type { DNSQuery, DNSQueryResult, DNSAnswer } from '../dns/types.js';
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
export interface DivergenceDetail {
    queryName: string;
    queryType: string;
    serversWithDifferentAnswers: string[];
    differentAnswers: DNSAnswer[][];
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
     */
    detectDivergence(responses: AuthoritativeResponse[]): {
        hasDivergence: boolean;
        divergenceDetails: DivergenceDetail[];
    };
    /**
     * Detect lame delegation
     */
    detectLameDelegation(responses: AuthoritativeResponse[]): LameDelegation[];
    /**
     * Collect with DNSSEC flags
     */
    collectWithDnssec(name: string, type: string, recursiveResolver: string): Promise<DNSQueryResult>;
    /**
     * Collect DNSKEY records
     */
    collectDnskey(domain: string, recursiveResolver: string): Promise<DNSQueryResult>;
    /**
     * Collect DS records from parent
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
    /**
     * Compare arrays for equality
     */
    private arraysEqual;
}
export type { DNSQueryResult, DNSAnswer, VantageInfo, } from '../dns/types.js';
//# sourceMappingURL=collector.d.ts.map