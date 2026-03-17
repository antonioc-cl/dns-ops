import { eq } from 'drizzle-orm'
import { observations, type Observation, type NewObservation } from '../schema'
import type { DbClient } from '../client'

export interface ObservationRepository {
  findById(id: string): Promise<Observation | null>
  findBySnapshotId(snapshotId: string): Promise<Observation[]>
  findByQuery(snapshotId: string, name: string, type: string): Promise<Observation[]>
  create(data: NewObservation): Promise<Observation>
  createMany(data: NewObservation[]): Promise<Observation[]>
}

export function createObservationRepository(db: DbClient): ObservationRepository {
  return {
    async findById(id: string): Promise<Observation | null> {
      const results = await db.select()
        .from(observations)
        .where(eq(observations.id, id))
        .limit(1)

      return results[0] || null
    },

    async findBySnapshotId(snapshotId: string): Promise<Observation[]> {
      return db.select()
        .from(observations)
        .where(eq(observations.snapshotId, snapshotId))
        .orderBy(observations.queryName, observations.queryType)
    },

    async findByQuery(snapshotId: string, name: string, type: string): Promise<Observation[]> {
      return db.select()
        .from(observations)
        .where(eq(observations.snapshotId, snapshotId))
        .where(eq(observations.queryName, name))
        .where(eq(observations.queryType, type))
    },

    async create(data: NewObservation): Promise<Observation> {
      const results = await db.insert(observations).values(data).returning()
      return results[0]
    },

    async createMany(data: NewObservation[]): Promise<Observation[]> {
      if (data.length === 0) return []
      return db.insert(observations).values(data).returning()
    },
  }
}
