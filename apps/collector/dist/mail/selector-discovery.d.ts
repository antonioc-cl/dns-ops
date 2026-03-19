/**
 * DKIM Selector Discovery Module
 *
 * Implements the 5-level precedence strategy:
 * 1. Managed zone configured selectors
 * 2. Operator-supplied selectors
 * 3. Provider-specific heuristics
 * 4. Common selector dictionary
 * 5. No selector found → partial
 */
import type { DNSQueryResult } from '../dns/types.js';
export interface SelectorDiscoveryConfig {
    managedSelectors?: string[];
    operatorSelectors?: string[];
    skipDictionary?: boolean;
    maxSelectors?: number;
}
export interface SelectorDiscoveryResult {
    selectors: string[];
    provenance: SelectorProvenance;
    confidence: SelectorConfidence;
    provider?: string;
    attempts: SelectorAttempt[];
}
export type SelectorProvenance = 'managed-zone-config' | 'operator-supplied' | 'provider-heuristic' | 'common-dictionary' | 'not-found';
export type SelectorConfidence = 'certain' | 'high' | 'medium' | 'low' | 'heuristic';
export interface SelectorAttempt {
    selector: string;
    found: boolean;
    source: SelectorProvenance;
}
export declare const COMMON_SELECTORS: string[];
/**
 * Detect mail provider from DNS query results
 */
export declare function detectProvider(results: DNSQueryResult[]): string;
/**
 * Get known selectors for a provider
 */
export declare function getProviderSelectors(provider: string): string[];
/**
 * Main selector discovery function
 * Implements 5-level precedence strategy
 */
export declare function discoverSelectors(_domain: string, dnsResults: DNSQueryResult[], config?: SelectorDiscoveryConfig): Promise<SelectorDiscoveryResult>;
/**
 * Build DKIM query names from selectors
 */
export declare function buildDkimQueryNames(domain: string, selectors: string[]): {
    name: string;
    type: string;
}[];
/**
 * Check if a DNS result indicates Null MX
 */
export declare function isNullMx(result: DNSQueryResult): boolean;
/**
 * Parse SPF record from TXT query result
 */
export declare function parseSpfRecord(result: DNSQueryResult): string | null;
/**
 * Check if TXT record is a DMARC record
 */
export declare function isDmarcRecord(result: DNSQueryResult): boolean;
/**
 * Check if TXT record is an MTA-STS record
 */
export declare function isMtaStsRecord(result: DNSQueryResult): boolean;
//# sourceMappingURL=selector-discovery.d.ts.map