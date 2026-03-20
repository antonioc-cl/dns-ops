/**
 * Parity Evidence Repository - Bead 12
 *
 * Handles persistence of shadow comparison and parity evidence:
 * - Shadow comparisons (durable, not process-local)
 * - Legacy access logs
 * - Provider baselines (read-only reference data)
 * - Mismatch reports
 */
import type { IDatabaseAdapter } from '../database/index.js';
import { type LegacyAccessLog, type MismatchReport, type NewLegacyAccessLog, type NewMismatchReport, type NewProviderBaseline, type NewShadowComparison, type ProviderBaseline, type ShadowComparison } from '../schema/parity.js';
export declare class ShadowComparisonRepository {
    private db;
    constructor(db: IDatabaseAdapter);
    /**
     * Store a new shadow comparison
     */
    create(data: NewShadowComparison): Promise<ShadowComparison>;
    /**
     * Find a comparison by ID
     */
    findById(id: string): Promise<ShadowComparison | undefined>;
    /**
     * Find comparisons by snapshot ID
     */
    findBySnapshotId(snapshotId: string): Promise<ShadowComparison[]>;
    /**
     * Find comparisons by domain
     */
    findByDomain(domain: string): Promise<ShadowComparison[]>;
    /**
     * Find all mismatches (status is 'mismatch' or 'partial-match')
     */
    findMismatches(): Promise<ShadowComparison[]>;
    /**
     * Find pending adjudications (mismatches without adjudication)
     */
    findPendingAdjudications(): Promise<ShadowComparison[]>;
    /**
     * Adjudicate a comparison
     */
    adjudicate(id: string, acknowledgedBy: string, adjudication: ShadowComparison['adjudication'], notes?: string): Promise<ShadowComparison | undefined>;
    /**
     * Get statistics for all comparisons
     */
    getStats(): Promise<{
        total: number;
        matches: number;
        mismatches: number;
        partialMatches: number;
        acknowledged: number;
        pending: number;
    }>;
    /**
     * Get recent comparisons (last N)
     */
    getRecent(limit?: number): Promise<ShadowComparison[]>;
}
export declare class LegacyAccessLogRepository {
    private db;
    constructor(db: IDatabaseAdapter);
    /**
     * Log a legacy tool access
     */
    log(data: NewLegacyAccessLog): Promise<LegacyAccessLog>;
    /**
     * Find logs by domain
     */
    findByDomain(domain: string): Promise<LegacyAccessLog[]>;
    /**
     * Find logs by tool type
     */
    findByToolType(toolType: LegacyAccessLog['toolType']): Promise<LegacyAccessLog[]>;
    /**
     * Find logs associated with a snapshot
     */
    findBySnapshotId(snapshotId: string): Promise<LegacyAccessLog[]>;
    /**
     * Get recent logs (last N)
     */
    getRecent(limit?: number): Promise<LegacyAccessLog[]>;
    /**
     * Get access statistics
     */
    getStats(): Promise<{
        total: number;
        byToolType: Record<string, number>;
        successRate: number;
        last24h: number;
    }>;
}
export declare class ProviderBaselineRepository {
    private db;
    constructor(db: IDatabaseAdapter);
    /**
     * Get all active baselines
     */
    findActive(): Promise<ProviderBaseline[]>;
    /**
     * Get baseline by provider key
     */
    findByProviderKey(providerKey: string): Promise<ProviderBaseline | undefined>;
    /**
     * Get all baselines (including deprecated)
     */
    findAll(): Promise<ProviderBaseline[]>;
    /**
     * Create a new baseline (admin only)
     */
    create(data: NewProviderBaseline): Promise<ProviderBaseline>;
    /**
     * Update a baseline (admin only)
     */
    update(id: string, data: Partial<NewProviderBaseline>): Promise<ProviderBaseline | undefined>;
    /**
     * Deprecate a baseline
     */
    deprecate(id: string): Promise<ProviderBaseline | undefined>;
    /**
     * Seed default provider baselines
     */
    seedDefaults(): Promise<void>;
}
export declare class MismatchReportRepository {
    private db;
    constructor(db: IDatabaseAdapter);
    /**
     * Create a new mismatch report
     */
    create(data: NewMismatchReport): Promise<MismatchReport>;
    /**
     * Find reports by domain
     */
    findByDomain(domain: string): Promise<MismatchReport[]>;
    /**
     * Find cutover-ready domains
     */
    findCutoverReady(): Promise<MismatchReport[]>;
    /**
     * Get latest report for a domain
     */
    getLatestForDomain(domain: string): Promise<MismatchReport | undefined>;
    /**
     * Generate a report from shadow comparisons
     */
    generateReport(shadowComparisonRepo: ShadowComparisonRepository, domain: string, periodStart: Date, periodEnd: Date, generatedBy: string): Promise<MismatchReport>;
}
//# sourceMappingURL=parity.d.ts.map