import { eq } from 'drizzle-orm';
import type { IDatabaseAdapter } from '../database/simple-adapter.js';
import { type NewObservation, type Observation, observations } from '../schema/index.js';

export class ObservationRepository {
  constructor(private db: IDatabaseAdapter) {}

  async findById(id: string): Promise<Observation | null> {
    const result = await this.db.selectOne(observations, eq(observations.id, id));
    return result || null;
  }

  async findBySnapshotId(snapshotId: string): Promise<Observation[]> {
    const results = await this.db.selectWhere(
      observations,
      eq(observations.snapshotId, snapshotId)
    );
    // Sort by queryName and queryType
    return results.sort((a, b) => {
      const nameCompare = a.queryName.localeCompare(b.queryName);
      if (nameCompare !== 0) return nameCompare;
      return a.queryType.localeCompare(b.queryType);
    });
  }

  async findByQuery(snapshotId: string, name: string, type: string): Promise<Observation[]> {
    const results = await this.db.select(observations);
    return results.filter(
      (o) => o.snapshotId === snapshotId && o.queryName === name && o.queryType === type
    );
  }

  async create(data: NewObservation): Promise<Observation> {
    return this.db.insert(observations, data);
  }

  async createMany(data: NewObservation[]): Promise<Observation[]> {
    if (data.length === 0) return [];
    return this.db.insertMany(observations, data);
  }
}
