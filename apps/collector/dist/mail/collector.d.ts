/**
 * Mail Collection Module
 *
 * Extends DNS collection to gather mail-related records:
 * - MX, SPF TXT, _dmarc, DKIM selectors, _mta-sts, _smtp._tls
 * - Null MX detection
 * - DKIM selector discovery with provenance tracking
 */
import type { DNSQueryResult } from '../dns/types';
import { type SelectorDiscoveryResult } from './selector-discovery';
export interface MailCollectionConfig {
    domain: string;
    operatorSelectors?: string[];
    managedSelectors?: string[];
    skipDictionary?: boolean;
}
export interface MailCollectionResult {
    queries: {
        name: string;
        type: string;
    }[];
    selectorDiscovery: SelectorDiscoveryResult;
    expectedRecords: {
        hasMx: boolean;
        hasSpf: boolean;
        hasDmarc: boolean;
        hasDkim: boolean;
        hasMtaSts: boolean;
        hasTlsRpt: boolean;
        isNullMx: boolean;
    };
}
/**
 * Generate mail-related DNS queries
 *
 * Uses the 5-level precedence strategy for DKIM selector discovery:
 * 1. Managed zone configured selectors
 * 2. Operator-supplied selectors
 * 3. Provider-specific heuristics
 * 4. Common selector dictionary
 * 5. No selector found → partial
 */
export declare function generateMailQueries(domain: string, existingResults?: DNSQueryResult[], config?: MailCollectionConfig): Promise<MailCollectionResult>;
/**
 * Analyze mail-related DNS results
 */
export declare function analyzeMailResults(results: DNSQueryResult[]): {
    mx: DNSQueryResult | null;
    spf: string | null;
    dmarc: DNSQueryResult | null;
    dkim: DNSQueryResult[];
    mtaSts: DNSQueryResult | null;
    tlsRpt: DNSQueryResult | null;
    isNullMx: boolean;
    provider: string;
};
/**
 * Check if a domain has valid mail configuration
 */
export declare function hasValidMailConfig(analysis: {
    mx: DNSQueryResult | null;
    spf: string | null;
    dmarc: DNSQueryResult | null;
    isNullMx: boolean;
}): {
    valid: boolean;
    issues: string[];
};
//# sourceMappingURL=collector.d.ts.map