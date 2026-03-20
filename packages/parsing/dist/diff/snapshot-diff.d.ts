/**
 * Snapshot Diff Engine - Bead 13
 *
 * Compares snapshots to detect changes in:
 * - Records and values
 * - TTLs
 * - Findings
 * - Query scope
 * - Ruleset version
 */
import type { Finding, RecordSet } from '@dns-ops/db/schema';
export interface SnapshotDiffResult {
    snapshotA: {
        id: string;
        createdAt: Date;
        rulesetVersion: string;
    };
    snapshotB: {
        id: string;
        createdAt: Date;
        rulesetVersion: string;
    };
    comparison: {
        recordChanges: RecordChange[];
        ttlChanges: TTLChange[];
        findingChanges: FindingChange[];
        scopeChanges: ScopeChange | null;
        rulesetChange: RulesetChange | null;
    };
    summary: {
        totalChanges: number;
        additions: number;
        deletions: number;
        modifications: number;
        unchanged: number;
    };
}
export interface RecordChange {
    type: 'added' | 'removed' | 'modified' | 'unchanged';
    name: string;
    recordType: string;
    valuesA?: string[];
    valuesB?: string[];
    diff?: {
        added: string[];
        removed: string[];
    };
}
export interface TTLChange {
    name: string;
    recordType: string;
    ttlA: number;
    ttlB: number;
    change: number;
}
export interface FindingChange {
    type: 'added' | 'removed' | 'modified' | 'unchanged';
    findingType: string;
    title: string;
    severityA?: string;
    severityB?: string;
    description?: string;
}
export interface ScopeChange {
    type: 'scope-changed';
    namesAdded: string[];
    namesRemoved: string[];
    typesAdded: string[];
    typesRemoved: string[];
    vantagesAdded: string[];
    vantagesRemoved: string[];
    message: string;
}
export interface RulesetChange {
    type: 'ruleset-changed';
    versionA: string;
    versionB: string;
    message: string;
}
/**
 * Compare two snapshots and generate diff
 */
export declare function compareSnapshots(snapshotA: {
    id: string;
    createdAt: Date;
    rulesetVersion: string;
    queriedNames: string[];
    queriedTypes: string[];
    vantages: string[];
}, snapshotB: {
    id: string;
    createdAt: Date;
    rulesetVersion: string;
    queriedNames: string[];
    queriedTypes: string[];
    vantages: string[];
}, recordsA: RecordSet[], recordsB: RecordSet[], findingsA: Finding[], findingsB: Finding[]): SnapshotDiffResult;
//# sourceMappingURL=snapshot-diff.d.ts.map