/**
 * Mail Evidence Repository
 *
 * Handles persistence of mail-specific evidence:
 * - DKIM selectors with provenance tracking
 * - Mail evidence summaries
 * - Provider detection results
 */
import type { IDatabaseAdapter } from '../database/index.js';
import { type DkimSelector, type MailEvidence, type NewDkimSelector, type NewMailEvidence } from '../schema/mail.js';
export declare class DkimSelectorRepository {
    private db;
    constructor(db: IDatabaseAdapter);
    /**
     * Create a new DKIM selector record
     */
    create(data: NewDkimSelector): Promise<DkimSelector>;
    /**
     * Create multiple DKIM selector records
     */
    createMany(data: NewDkimSelector[]): Promise<DkimSelector[]>;
    /**
     * Find selectors by snapshot ID
     */
    findBySnapshotId(snapshotId: string): Promise<DkimSelector[]>;
    /**
     * Find selectors by domain across all snapshots
     */
    findByDomain(domain: string): Promise<DkimSelector[]>;
    /**
     * Find selectors by provider
     */
    findByProvider(provider: DkimSelector['provider']): Promise<DkimSelector[]>;
    /**
     * Find valid (found) selectors for a snapshot
     */
    findValidBySnapshotId(snapshotId: string): Promise<DkimSelector[]>;
    /**
     * Delete selectors by snapshot ID
     */
    deleteBySnapshotId(snapshotId: string): Promise<number>;
    /**
     * Get unique providers for a domain
     */
    getProvidersForDomain(domain: string): Promise<string[]>;
}
export declare class MailEvidenceRepository {
    private db;
    constructor(db: IDatabaseAdapter);
    /**
     * Create or update mail evidence for a snapshot
     */
    upsert(data: NewMailEvidence): Promise<MailEvidence>;
    /**
     * Find mail evidence by snapshot ID
     */
    findBySnapshotId(snapshotId: string): Promise<MailEvidence | undefined>;
    /**
     * Find mail evidence by domain (latest)
     */
    findLatestByDomain(domain: string): Promise<MailEvidence | undefined>;
    /**
     * Find all mail evidence for a domain
     */
    findByDomain(domain: string): Promise<MailEvidence[]>;
    /**
     * Find mail evidence by provider
     */
    findByProvider(provider: MailEvidence['detectedProvider']): Promise<MailEvidence[]>;
    /**
     * Find domains without DMARC
     */
    findWithoutDmarc(limit?: number): Promise<MailEvidence[]>;
    /**
     * Find domains with weak DMARC policy
     */
    findWithWeakDmarc(limit?: number): Promise<MailEvidence[]>;
    /**
     * Get domains with MTA-STS enabled
     */
    findWithMtaSts(): Promise<MailEvidence[]>;
    /**
     * Delete mail evidence by snapshot ID
     */
    deleteBySnapshotId(snapshotId: string): Promise<number>;
    /**
     * Get security score distribution
     */
    getScoreDistribution(): Promise<{
        score: string;
        count: number;
    }[]>;
}
//# sourceMappingURL=mail-evidence.d.ts.map