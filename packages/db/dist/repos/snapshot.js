/**
 * DNS Ops Workbench - Snapshot Repository
 *
 * Repository pattern for snapshot operations.
 * Snapshots represent point-in-time collections of DNS data.
 */
import { eq } from 'drizzle-orm';
import { snapshots } from '../schema/index.js';
export class SnapshotRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    /**
     * Find a snapshot by ID
     */
    async findById(id) {
        return this.db.selectOne(snapshots, eq(snapshots.id, id));
    }
    /**
     * Get all snapshots for a domain
     */
    async findByDomain(domainId, limit = 50) {
        const results = await this.db.selectWhere(snapshots, eq(snapshots.domainId, domainId));
        // Sort by createdAt desc and limit
        return results
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, limit);
    }
    /**
     * Get the most recent snapshot for a domain
     */
    async findLatestByDomain(domainId) {
        const results = await this.db.selectWhere(snapshots, eq(snapshots.domainId, domainId));
        // Sort by createdAt desc and return first
        return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    }
    /**
     * Get snapshots by result state
     */
    async findByState(state, limit = 100) {
        const results = await this.db.selectWhere(snapshots, eq(snapshots.resultState, state));
        return results
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, limit);
    }
    /**
     * Create a new snapshot
     */
    async create(data) {
        return this.db.insert(snapshots, data);
    }
    /**
     * Update snapshot with error information
     */
    async updateError(id, errorMessage) {
        return this.db.updateOne(snapshots, { errorMessage }, eq(snapshots.id, id));
    }
    /**
     * Update snapshot with collection duration
     */
    async updateDuration(id, durationMs) {
        return this.db.updateOne(snapshots, { collectionDurationMs: durationMs }, eq(snapshots.id, id));
    }
    /**
     * List snapshots with pagination
     */
    async list(options = {}) {
        const { limit = 100, offset = 0 } = options;
        const results = await this.db.select(snapshots);
        return results
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(offset, offset + limit);
    }
    /**
     * Count snapshots by domain
     */
    async countByDomain(domainId) {
        const results = await this.db.selectWhere(snapshots, eq(snapshots.domainId, domainId));
        return results.length;
    }
    /**
     * Update snapshot's ruleset version ID
     *
     * Called after findings evaluation to mark the snapshot as having been
     * analyzed with a specific ruleset version. This allows downstream consumers
     * to distinguish between "no findings" (empty but evaluated) and
     * "findings not yet evaluated" (rulesetVersionId is null).
     */
    async updateRulesetVersion(id, rulesetVersionId) {
        return this.db.updateOne(snapshots, { rulesetVersionId }, eq(snapshots.id, id));
    }
}
//# sourceMappingURL=snapshot.js.map