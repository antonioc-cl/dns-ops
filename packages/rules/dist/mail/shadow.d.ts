/**
 * Shadow Comparison Module - Bead 09
 *
 * Compares new mail rule findings against legacy DMARC/DKIM tool outputs.
 * Enables safe cutover by identifying mismatches before switching authority.
 */
import type { NewFinding } from '@dns-ops/db';
export interface ShadowComparisonResult {
    snapshotId: string;
    domain: string;
    comparedAt: Date;
    status: 'match' | 'mismatch' | 'partial-match' | 'error';
    comparisons: FieldComparison[];
    metrics: {
        totalFields: number;
        matchingFields: number;
        mismatchingFields: number;
        missingInNew: number;
        missingInLegacy: number;
    };
    summary: string;
}
export interface FieldComparison {
    field: 'dmarc-present' | 'dmarc-valid' | 'dmarc-policy' | 'spf-present' | 'spf-valid' | 'dkim-present' | 'dkim-valid' | 'dkim-selector';
    legacyValue: string | boolean | null;
    newValue: string | boolean | null;
    status: 'match' | 'mismatch' | 'missing-in-legacy' | 'missing-in-new' | 'not-comparable';
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    explanation: string;
}
export interface LegacyToolOutput {
    domain: string;
    checkedAt: Date;
    dmarc: {
        present: boolean;
        valid: boolean;
        policy?: string;
        record?: string;
        errors?: string[];
    };
    spf: {
        present: boolean;
        valid: boolean;
        record?: string;
        errors?: string[];
    };
    dkim: {
        present: boolean;
        valid: boolean;
        selector?: string;
        record?: string;
        errors?: string[];
    };
    rawOutput?: string;
}
export declare class ShadowComparator {
    /**
     * Compare new findings against legacy tool output
     */
    compare(snapshotId: string, domain: string, newFindings: NewFinding[], legacyOutput: LegacyToolOutput): ShadowComparisonResult;
    private compareDmarcPresence;
    private compareDmarcValidity;
    private compareDmarcPolicy;
    private compareSpfPresence;
    private compareSpfValidity;
    private compareDkimPresence;
    private compareDkimValidity;
    private calculateMetrics;
    private determineOverallStatus;
    private generateSummary;
}
export interface StoredShadowComparison extends ShadowComparisonResult {
    id: string;
    acknowledgedAt?: Date;
    acknowledgedBy?: string;
    adjudication?: 'new-correct' | 'legacy-correct' | 'both-wrong' | 'acceptable-difference';
    notes?: string;
}
export declare class ShadowComparisonStore {
    private comparisons;
    store(comparison: ShadowComparisonResult): StoredShadowComparison;
    get(id: string): StoredShadowComparison | undefined;
    getBySnapshot(snapshotId: string): StoredShadowComparison[];
    getByDomain(domain: string): StoredShadowComparison[];
    getMismatches(): StoredShadowComparison[];
    acknowledge(id: string, by: string, adjudication: StoredShadowComparison['adjudication'], notes?: string): StoredShadowComparison | undefined;
    getStats(): {
        total: number;
        matches: number;
        mismatches: number;
        partialMatches: number;
        acknowledged: number;
        pending: number;
    };
}
export declare const shadowStore: ShadowComparisonStore;
export declare const shadowComparator: ShadowComparator;
//# sourceMappingURL=shadow.d.ts.map