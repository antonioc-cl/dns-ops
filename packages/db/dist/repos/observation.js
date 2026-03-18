import { eq, and } from 'drizzle-orm';
import { observations } from '../schema';
export class ObservationRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async findById(id) {
        const results = await this.db.select()
            .from(observations)
            .where(eq(observations.id, id))
            .limit(1);
        return results[0] || null;
    }
    async findBySnapshotId(snapshotId) {
        return this.db.select()
            .from(observations)
            .where(eq(observations.snapshotId, snapshotId))
            .orderBy(observations.queryName, observations.queryType);
    }
    async findByQuery(snapshotId, name, type) {
        return this.db.select()
            .from(observations)
            .where(and(eq(observations.snapshotId, snapshotId), eq(observations.queryName, name), eq(observations.queryType, type)));
    }
    async create(data) {
        const results = await this.db.insert(observations).values(data).returning();
        return results[0];
    }
    async createMany(data) {
        if (data.length === 0)
            return [];
        return this.db.insert(observations).values(data).returning();
    }
}
//# sourceMappingURL=observation.js.map