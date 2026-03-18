/**
 * DNS Ops Workbench - Snapshot Repository
 *
 * Repository pattern for snapshot operations.
 * Snapshots represent point-in-time collections of DNS data.
 */
import { eq, desc, sql } from 'drizzle-orm';
import { snapshots } from '../schema';
export class SnapshotRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    /**
     * Find a snapshot by ID
     */
    async findById(id) {
        const result = await this.db
            .select()
            .from(snapshots)
            .where(eq(snapshots.id, id))
            .limit(1);
        return result[0];
    }
    /**
     * Get all snapshots for a domain
     */
    async findByDomain(domainId, limit = 50) {
        return this.db
            .select()
            .from(snapshots)
            .where(eq(snapshots.domainId, domainId))
            .orderBy(desc(snapshots.createdAt))
            .limit(limit);
    }
    /**
     * Get the most recent snapshot for a domain
     */
    async findLatestByDomain(domainId) {
        const result = await this.db
            .select()
            .from(snapshots)
            .where(eq(snapshots.domainId, domainId))
            .orderBy(desc(snapshots.createdAt))
            .limit(1);
        return result[0];
    }
    /**
     * Get snapshots by result state
     */
    async findByState(state, limit = 100) {
        return this.db
            .select()
            .from(snapshots)
            .where(eq(snapshots.resultState, state))
            .orderBy(desc(snapshots.createdAt))
            .limit(limit);
    }
    /**
     * Create a new snapshot
     */
    async create(data) {
        const result = await this.db
            .insert(snapshots)
            .values(data)
            .returning();
        return result[0];
    }
    /**
     * Update snapshot with error information
     */
    async updateError(id, errorMessage) {
        const result = await this.db
            .update(snapshots)
            .set({ errorMessage })
            .where(eq(snapshots.id, id))
            .returning();
        return result[0];
    }
    /**
     * Update snapshot with collection duration
     */
    async updateDuration(id, durationMs) {
        const result = await this.db
            .update(snapshots)
            .set({ collectionDurationMs: durationMs })
            .where(eq(snapshots.id, id))
            .returning();
        return result[0];
    }
    /**
     * List snapshots with pagination
     */
    async list(options = {}) {
        const { limit = 100, offset = 0 } = options;
        return this.db
            .select()
            .from(snapshots)
            .orderBy(desc(snapshots.createdAt))
            .limit(limit)
            .offset(offset);
    }
    /**
     * Count snapshots by domain
     */
    async countByDomain(domainId) {
        const result = await this.db
            .select({ count: sql `count(*)` })
            .from(snapshots)
            .where(eq(snapshots.domainId, domainId));
        return result[0]?.count || 0;
    }
}
//# sourceMappingURL=snapshot.js.map