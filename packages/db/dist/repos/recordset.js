import { eq, and } from 'drizzle-orm';
import { recordSets } from '../schema';
export class RecordSetRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async findById(id) {
        const results = await this.db.select()
            .from(recordSets)
            .where(eq(recordSets.id, id))
            .limit(1);
        return results[0] || null;
    }
    async findBySnapshotId(snapshotId) {
        return this.db.select()
            .from(recordSets)
            .where(eq(recordSets.snapshotId, snapshotId))
            .orderBy(recordSets.type, recordSets.name);
    }
    async findByNameAndType(snapshotId, name, type) {
        const results = await this.db.select()
            .from(recordSets)
            .where(and(eq(recordSets.snapshotId, snapshotId), eq(recordSets.name, name), eq(recordSets.type, type)))
            .limit(1);
        return results[0] || null;
    }
    async create(data) {
        const results = await this.db.insert(recordSets).values(data).returning();
        return results[0];
    }
    async createMany(data) {
        if (data.length === 0)
            return [];
        return this.db.insert(recordSets).values(data).returning();
    }
    async update(id, data) {
        const results = await this.db.update(recordSets)
            .set(data)
            .where(eq(recordSets.id, id))
            .returning();
        return results[0];
    }
}
//# sourceMappingURL=recordset.js.map