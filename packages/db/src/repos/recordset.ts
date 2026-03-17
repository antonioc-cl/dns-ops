import { eq } from 'drizzle-orm'
import { recordSets, type RecordSet, type NewRecordSet } from '../schema'
import type { DbClient } from '../client'

export interface RecordSetRepository {
  findById(id: string): Promise<RecordSet | null>
  findBySnapshotId(snapshotId: string): Promise<RecordSet[]>
  findByNameAndType(snapshotId: string, name: string, type: string): Promise<RecordSet | null>
  create(data: NewRecordSet): Promise<RecordSet>
  createMany(data: NewRecordSet[]): Promise<RecordSet[]>
  update(id: string, data: Partial<NewRecordSet>): Promise<RecordSet>
}

export function createRecordSetRepository(db: DbClient): RecordSetRepository {
  return {
    async findById(id: string): Promise<RecordSet | null> {
      const results = await db.select()
        .from(recordSets)
        .where(eq(recordSets.id, id))
        .limit(1)

      return results[0] || null
    },

    async findBySnapshotId(snapshotId: string): Promise<RecordSet[]> {
      return db.select()
        .from(recordSets)
        .where(eq(recordSets.snapshotId, snapshotId))
        .orderBy(recordSets.type, recordSets.name)
    },

    async findByNameAndType(snapshotId: string, name: string, type: string): Promise<RecordSet | null> {
      const results = await db.select()
        .from(recordSets)
        .where(eq(recordSets.snapshotId, snapshotId))
        .where(eq(recordSets.name, name))
        .where(eq(recordSets.type, type))
        .limit(1)

      return results[0] || null
    },

    async create(data: NewRecordSet): Promise<RecordSet> {
      const results = await db.insert(recordSets).values(data).returning()
      return results[0]
    },

    async createMany(data: NewRecordSet[]): Promise<RecordSet[]> {
      if (data.length === 0) return []
      return db.insert(recordSets).values(data).returning()
    },

    async update(id: string, data: Partial<NewRecordSet>): Promise<RecordSet> {
      const results = await db.update(recordSets)
        .set(data)
        .where(eq(recordSets.id, id))
        .returning()
      return results[0]
    },
  }
}
