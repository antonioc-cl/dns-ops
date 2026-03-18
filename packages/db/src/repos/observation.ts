import { eq, and } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { observations, type Observation, type NewObservation } from '../schema.js'
import * as schema from '../schema.js'

type DB = NodePgDatabase<typeof schema> | DrizzleD1Database<typeof schema>

export class ObservationRepository {
  constructor(private db: DB) {}

  async findById(id: string): Promise<Observation | null> {
    const results = await this.db.select()
      .from(observations)
      .where(eq(observations.id, id))
      .limit(1)

    return results[0] || null
  }

  async findBySnapshotId(snapshotId: string): Promise<Observation[]> {
    return this.db.select()
      .from(observations)
      .where(eq(observations.snapshotId, snapshotId))
      .orderBy(observations.queryName, observations.queryType)
  }

  async findByQuery(snapshotId: string, name: string, type: string): Promise<Observation[]> {
    return this.db.select()
      .from(observations)
      .where(and(
        eq(observations.snapshotId, snapshotId),
        eq(observations.queryName, name),
        eq(observations.queryType, type)
      ))
  }

  async create(data: NewObservation): Promise<Observation> {
    const results = await this.db.insert(observations).values(data).returning()
    return results[0]
  }

  async createMany(data: NewObservation[]): Promise<Observation[]> {
    if (data.length === 0) return []
    return this.db.insert(observations).values(data).returning()
  }
}
