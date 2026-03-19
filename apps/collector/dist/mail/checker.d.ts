/**
 * Mail Checker
 *
 * Performs DMARC, DKIM, and SPF checks for email security validation.
 */
import { type DMARCRecord, type SPFRecord } from '@dns-ops/parsing';
export interface MailCheckResult {
    domain: string;
    dmarc: RecordCheckResult;
    dkim: DKIMCheckResult;
    spf: RecordCheckResult;
    checkedAt: Date;
}
export interface RecordCheckResult {
    present: boolean;
    valid: boolean;
    record?: string;
    parsed?: DMARCRecord | SPFRecord;
    errors?: string[];
}
export interface DKIMCheckResult extends RecordCheckResult {
    selector?: string;
    selectorProvenance: SelectorProvenance;
    triedSelectors: string[];
}
export type SelectorProvenance = 'managed' | 'heuristic' | 'operator' | 'default';
export interface ProviderSelectorInfo {
    selector: string;
    confidence: number;
}
export declare const PROVIDER_SELECTORS: Record<string, ProviderSelectorInfo>;
export declare const COMMON_SELECTORS: string[];
/**
 * Perform complete mail check (DMARC, DKIM, SPF)
 */
export declare function performMailCheck(domain: string, options?: {
    preferredProvider?: string;
    explicitSelectors?: string[];
}): Promise<MailCheckResult>;
/**
 * Check DMARC record
 */
export declare function checkDMARC(domain: string): Promise<RecordCheckResult>;
/**
 * Check DKIM record with selector discovery
 */
export declare function checkDKIM(domain: string, options?: {
    preferredProvider?: string;
    explicitSelectors?: string[];
}): Promise<DKIMCheckResult>;
/**
 * Check SPF record
 */
export declare function checkSPF(domain: string): Promise<RecordCheckResult>;
//# sourceMappingURL=checker.d.ts.map