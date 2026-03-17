/**
 * DNS Ops Workbench - Observation Repository
 *
 * Repository pattern for observation operations.
 * Observations are immutable records of DNS queries.
 */

import { eq, and, desc } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { observations, type Observation, type NewObservation } from '../schema';
import * as schema from '../schema';

type DB = NodePgDatabase<typeof schema> | DrizzleD1Database<typeof schema>;

export class ObservationRepository {
  constructor(private db: DB) {}

  /**
   * Find an observation by ID
   */
  async findById(id: string): Promise<Observation | undefined> {
    const result = await this.db
      .select()
      .from(observations)
      .where(eq(observations.id, id))
      .limit(1);
    return result[0];
  }

  /**
   * Get all observations for a snapshot
   */
  async findBySnapshot(snapshotId: string): Promise<Observation[]> {
    return this.db
      .select()
      .from(observations)
      .where(eq(observations.snapshotId, snapshotId))
      .orderBy(desc(observations.queriedAt));
  }

  /**
   * Get observations for a specific query within a snapshot
   */
  async findByQuery(
    snapshotId: string,
    queryName: string,
    queryType: string
  ): Promise<Observation[]> {
    return this.db
      .select()
      .from(observations)
      .where(
        and(
          eq(observations.snapshotId, snapshotId),
          eq(observations.queryName, queryName),
          eq(observations.queryType, queryType)
        )
      )
      .orderBy(desc(observations.queriedAt));
  }

  /**
   * Get observations by status
   */
  async findByStatus(
    snapshotId: string,
    status: 'success' | 'timeout' | 'refused' | 'truncated' | 'nxdomain' | 'nodata' | 'error'
  ): Promise<Observation[]> {
    return this.db
      .select()
      .from(observations)
      .where(
        and(
          eq(observations.snapshotId, snapshotId),
          eq(observations.status, status)
        )
      );
  }

  /**
   * Create a new observation
   * Note: Observations are immutable - no update method provided
   */
  async create(data: NewObservation): Promise<Observation> {
    const result = await this.db
      .insert(observations)
      .values(data)
      .returning();
    return result[0];
  }

  /**
   * Create multiple observations in a batch
   */
  async createMany(data: NewObservation[]): Promise<Observation[]> {
    if (data.length === 0) return [];
    return this.db
      .insert(observations)
      .values(data)
      .returning();
  }

  /**
   * Get successful observations for a snapshot
   */
  async findSuccessful(snapshotId: string): Promise<Observation[]> {
    return this.db
      .select()
      .from(observations)
      .where(
        and(
          eq(observations.snapshotId, snapshotId),
          eq(observations.status, 'success')
        )
      );
  }

  /**
   * Get failed observations for a snapshot
   */
  async findFailed(snapshotId: string): Promise<Observation[]> {
    return this.db
      .select()
      .from(observations)
      .where(
        and(
          eq(observations.snapshotId, snapshotId),
          eq(observations.status, 'error')
        )
      );
  }

  /**
   * Count observations by status for a snapshot
   */
  async countByStatus(snapshotId: string): Promise<Record<string, number>> {
    const result = await this.db
      .select({
        status: observations.status,
        count: sql<number>`count(*)`,
      })
      .from(observations)
      .where(eq(observations.snapshotId, snapshotId))
      .groupBy(observations.status);

    return result.reduce((acc, row) => {
      acc[row.status] = row.count;
      return acc;
    }, {} as Record<string, number>);
  }
}

import { sql } from 'drizzle-orm';
