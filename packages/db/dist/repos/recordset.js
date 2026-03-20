import { eq } from 'drizzle-orm';
import { recordSets } from '../schema/index.js';
export class RecordSetRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async findById(id) {
        const result = await this.db.selectOne(recordSets, eq(recordSets.id, id));
        return result || null;
    }
    async findBySnapshotId(snapshotId) {
        const results = await this.db.selectWhere(recordSets, eq(recordSets.snapshotId, snapshotId));
        // Sort by type and name
        return results.sort((a, b) => {
            const typeCompare = a.type.localeCompare(b.type);
            if (typeCompare !== 0)
                return typeCompare;
            return a.name.localeCompare(b.name);
        });
    }
    async findByNameAndType(snapshotId, name, type) {
        const results = await this.db.select(recordSets);
        const match = results.find((r) => r.snapshotId === snapshotId && r.name === name && r.type === type);
        return match || null;
    }
    async create(data) {
        return this.db.insert(recordSets, data);
    }
    async createMany(data) {
        if (data.length === 0)
            return [];
        return this.db.insertMany(recordSets, data);
    }
    async update(id, data) {
        return this.db.updateOne(recordSets, data, eq(recordSets.id, id));
    }
}
//# sourceMappingURL=recordset.js.map