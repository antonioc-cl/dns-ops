/**
 * DNS Ops Workbench - Snapshot Repository
 *
 * Repository pattern for snapshot operations.
 * Snapshots represent point-in-time collections of DNS data.
 */
import type { IDatabaseAdapter } from '../database/simple-adapter.js';
import { type Snapshot, type NewSnapshot } from '../schema/index.js';
export declare class SnapshotRepository {
    private db;
    constructor(db: IDatabaseAdapter);
    /**
     * Find a snapshot by ID
     */
    findById(id: string): Promise<Snapshot | undefined>;
    /**
     * Get all snapshots for a domain
     */
    findByDomain(domainId: string, limit?: number): Promise<Snapshot[]>;
    /**
     * Get the most recent snapshot for a domain
     */
    findLatestByDomain(domainId: string): Promise<Snapshot | undefined>;
    /**
     * Get snapshots by result state
     */
    findByState(state: 'complete' | 'partial' | 'failed', limit?: number): Promise<Snapshot[]>;
    /**
     * Create a new snapshot
     */
    create(data: NewSnapshot): Promise<Snapshot>;
    /**
     * Update snapshot with error information
     */
    updateError(id: string, errorMessage: string): Promise<Snapshot | undefined>;
    /**
     * Update snapshot with collection duration
     */
    updateDuration(id: string, durationMs: number): Promise<Snapshot | undefined>;
    /**
     * List snapshots with pagination
     */
    list(options?: {
        limit?: number;
        offset?: number;
    }): Promise<Snapshot[]>;
    /**
     * Count snapshots by domain
     */
    countByDomain(domainId: string): Promise<number>;
}
//# sourceMappingURL=snapshot.d.ts.map