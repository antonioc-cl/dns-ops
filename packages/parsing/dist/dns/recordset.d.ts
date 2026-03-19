/**
 * RecordSet Normalization
 *
 * Convert observations into normalized RecordSets for querying and display.
 * Aggregates multiple vantage points for the same name/type.
 */
import type { Observation } from '@dns-ops/db/schema';
export interface NormalizedRecord {
    name: string;
    type: string;
    ttl: number;
    values: string[];
    sourceVantages: string[];
    sourceObservationIds: string[];
    isConsistent: boolean;
    consolidationNotes?: string;
}
export interface RecordSetDiff {
    type: 'added' | 'removed' | 'modified' | 'unchanged';
    name: string;
    recordType: string;
    before?: NormalizedRecord;
    after?: NormalizedRecord;
    changes?: Array<{
        field: string;
        before: unknown;
        after: unknown;
    }>;
}
/**
 * Normalize observations into RecordSets
 *
 * Handles mixed success/failure states across vantages.
 * Failed observations are included in metadata but don't contribute values.
 */
export declare function observationsToRecordSets(observations: Observation[]): NormalizedRecord[];
/**
 * Group records by type for organized display
 */
export declare function groupRecordsByType(records: NormalizedRecord[]): Map<string, NormalizedRecord[]>;
/**
 * Format record value for display
 */
export declare function formatRecordValue(type: string, value: string): string;
/**
 * Get record type description
 */
export declare function getRecordTypeDescription(type: string): string;
//# sourceMappingURL=recordset.d.ts.map