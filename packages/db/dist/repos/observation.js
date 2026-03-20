import { eq } from 'drizzle-orm';
import { observations } from '../schema/index.js';
export class ObservationRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async findById(id) {
        const result = await this.db.selectOne(observations, eq(observations.id, id));
        return result || null;
    }
    async findBySnapshotId(snapshotId) {
        const results = await this.db.selectWhere(observations, eq(observations.snapshotId, snapshotId));
        // Sort by queryName and queryType
        return results.sort((a, b) => {
            const nameCompare = a.queryName.localeCompare(b.queryName);
            if (nameCompare !== 0)
                return nameCompare;
            return a.queryType.localeCompare(b.queryType);
        });
    }
    async findByQuery(snapshotId, name, type) {
        const results = await this.db.select(observations);
        return results.filter((o) => o.snapshotId === snapshotId && o.queryName === name && o.queryType === type);
    }
    async create(data) {
        return this.db.insert(observations, data);
    }
    async createMany(data) {
        if (data.length === 0)
            return [];
        return this.db.insertMany(observations, data);
    }
}
//# sourceMappingURL=observation.js.map