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
 *
 * DNS-003: This function returns selector CANDIDATES.
 * The `found` flag indicates DNS confirmation status:
 * - `found: false` means it's a candidate that needs DNS verification
 * - `found: true` means the DKIM key was actually found via DNS query
 *
 * Callers must verify selectors by querying DNS and updating the `found` status.
 *
 * NOTE ON CASCADE BEHAVIOR: If configured selectors (managed or operator) are
 * all invalid (fail isValidSelector), the function cascades to the next level.
 * This is intentional - invalid configured selectors should not block fallback
 * to heuristic discovery. The provenance chain in `attempts` tracks what was tried.
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
 * DNS-003: Update selector attempts with DNS verification results
 *
 * After querying DNS for DKIM keys, call this to mark which selectors were found.
 *
 * @param attempts - The attempts array from discoverSelectors()
 * @param dkimResults - DNS query results for DKIM keys
 * @returns Updated attempts with found status
 */
export declare function updateSelectorResults(attempts: SelectorAttempt[], dkimResults: DNSQueryResult[]): SelectorAttempt[];
/**
 * Check if TXT record is a DMARC record
 */
export declare function isDmarcRecord(result: DNSQueryResult): boolean;
/**
 * Check if TXT record is an MTA-STS record
 */
export declare function isMtaStsRecord(result: DNSQueryResult): boolean;
//# sourceMappingURL=selector-discovery.d.ts.map