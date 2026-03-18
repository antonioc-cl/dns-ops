/**
 * DNS Ops Workbench - Snapshot Repository
 *
 * Repository pattern for snapshot operations.
 * Snapshots represent point-in-time collections of DNS data.
 */

import { eq, desc, and, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { snapshots, type Snapshot, type NewSnapshot } from '../schema.js';
import * as schema from '../schema.js';

type DB = NodePgDatabase<typeof schema> | DrizzleD1Database<typeof schema>;

export class SnapshotRepository {
  constructor(private db: DB) {}

  /**
   * Find a snapshot by ID
   */
  async findById(id: string): Promise<Snapshot | undefined> {
    const result = await this.db
      .select()
      .from(snapshots)
      .where(eq(snapshots.id, id))
      .limit(1);
    return result[0];
  }

  /**
   * Get all snapshots for a domain
   */
  async findByDomain(domainId: string, limit: number = 50): Promise<Snapshot[]> {
    return this.db
      .select()
      .from(snapshots)
      .where(eq(snapshots.domainId, domainId))
      .orderBy(desc(snapshots.createdAt))
      .limit(limit);
  }

  /**
   * Get the most recent snapshot for a domain
   */
  async findLatestByDomain(domainId: string): Promise<Snapshot | undefined> {
    const result = await this.db
      .select()
      .from(snapshots)
      .where(eq(snapshots.domainId, domainId))
      .orderBy(desc(snapshots.createdAt))
      .limit(1);
    return result[0];
  }

  /**
   * Get snapshots by result state
   */
  async findByState(
    state: 'complete' | 'partial' | 'failed',
    limit: number = 100
  ): Promise<Snapshot[]> {
    return this.db
      .select()
      .from(snapshots)
      .where(eq(snapshots.resultState, state))
      .orderBy(desc(snapshots.createdAt))
      .limit(limit);
  }

  /**
   * Create a new snapshot
   */
  async create(data: NewSnapshot): Promise<Snapshot> {
    const result = await this.db
      .insert(snapshots)
      .values(data)
      .returning();
    return result[0];
  }

  /**
   * Update snapshot with error information
   */
  async updateError(
    id: string,
    errorMessage: string
  ): Promise<Snapshot | undefined> {
    const result = await this.db
      .update(snapshots)
      .set({ errorMessage })
      .where(eq(snapshots.id, id))
      .returning();
    return result[0];
  }

  /**
   * Update snapshot with collection duration
   */
  async updateDuration(
    id: string,
    durationMs: number
  ): Promise<Snapshot | undefined> {
    const result = await this.db
      .update(snapshots)
      .set({ collectionDurationMs: durationMs })
      .where(eq(snapshots.id, id))
      .returning();
    return result[0];
  }

  /**
   * List snapshots with pagination
   */
  async list(options: { limit?: number; offset?: number } = {}): Promise<Snapshot[]> {
    const { limit = 100, offset = 0 } = options;
    return this.db
      .select()
      .from(snapshots)
      .orderBy(desc(snapshots.createdAt))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Count snapshots by domain
   */
  async countByDomain(domainId: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(snapshots)
      .where(eq(snapshots.domainId, domainId));
    return result[0]?.count || 0;
  }
}

import { sql } from 'drizzle-orm';
