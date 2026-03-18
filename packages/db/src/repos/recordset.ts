import { eq, and } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { recordSets, type RecordSet, type NewRecordSet } from '../schema/index.js'
import * as schema from '../schema/index.js'

type DB = NodePgDatabase<typeof schema> | DrizzleD1Database<typeof schema>

export class RecordSetRepository {
  constructor(private db: DB) {}

  async findById(id: string): Promise<RecordSet | null> {
    const results = await this.db.select()
      .from(recordSets)
      .where(eq(recordSets.id, id))
      .limit(1)

    return results[0] || null
  }

  async findBySnapshotId(snapshotId: string): Promise<RecordSet[]> {
    return this.db.select()
      .from(recordSets)
      .where(eq(recordSets.snapshotId, snapshotId))
      .orderBy(recordSets.type, recordSets.name)
  }

  async findByNameAndType(snapshotId: string, name: string, type: string): Promise<RecordSet | null> {
    const results = await this.db.select()
      .from(recordSets)
      .where(and(
        eq(recordSets.snapshotId, snapshotId),
        eq(recordSets.name, name),
        eq(recordSets.type, type)
      ))
      .limit(1)

    return results[0] || null
  }

  async create(data: NewRecordSet): Promise<RecordSet> {
    const results = await this.db.insert(recordSets).values(data).returning()
    return results[0]
  }

  async createMany(data: NewRecordSet[]): Promise<RecordSet[]> {
    if (data.length === 0) return []
    return this.db.insert(recordSets).values(data).returning()
  }

  async update(id: string, data: Partial<NewRecordSet>): Promise<RecordSet> {
    const results = await this.db.update(recordSets)
      .set(data)
      .where(eq(recordSets.id, id))
      .returning()
    return results[0]
  }
}
