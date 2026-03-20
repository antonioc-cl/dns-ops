/**
 * DNS Ops Workbench - Snapshot Repository
 *
 * Repository pattern for snapshot operations.
 * Snapshots represent point-in-time collections of DNS data.
 */

import { eq } from 'drizzle-orm';
import type { IDatabaseAdapter } from '../database/simple-adapter.js';
import { type NewSnapshot, type Snapshot, snapshots } from '../schema/index.js';

export class SnapshotRepository {
  constructor(private db: IDatabaseAdapter) {}

  /**
   * Find a snapshot by ID
   */
  async findById(id: string): Promise<Snapshot | undefined> {
    return this.db.selectOne(snapshots, eq(snapshots.id, id));
  }

  /**
   * Get all snapshots for a domain
   */
  async findByDomain(domainId: string, limit: number = 50): Promise<Snapshot[]> {
    const results = await this.db.selectWhere(snapshots, eq(snapshots.domainId, domainId));
    // Sort by createdAt desc and limit
    return results
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  /**
   * Get the most recent snapshot for a domain
   */
  async findLatestByDomain(domainId: string): Promise<Snapshot | undefined> {
    const results = await this.db.selectWhere(snapshots, eq(snapshots.domainId, domainId));
    // Sort by createdAt desc and return first
    return results.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
  }

  /**
   * Get snapshots by result state
   */
  async findByState(
    state: 'complete' | 'partial' | 'failed',
    limit: number = 100
  ): Promise<Snapshot[]> {
    const results = await this.db.selectWhere(snapshots, eq(snapshots.resultState, state));
    return results
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  /**
   * Create a new snapshot
   */
  async create(data: NewSnapshot): Promise<Snapshot> {
    return this.db.insert(snapshots, data);
  }

  /**
   * Update snapshot with error information
   */
  async updateError(id: string, errorMessage: string): Promise<Snapshot | undefined> {
    return this.db.updateOne(snapshots, { errorMessage }, eq(snapshots.id, id));
  }

  /**
   * Update snapshot with collection duration
   */
  async updateDuration(id: string, durationMs: number): Promise<Snapshot | undefined> {
    return this.db.updateOne(snapshots, { collectionDurationMs: durationMs }, eq(snapshots.id, id));
  }

  /**
   * List snapshots with pagination
   */
  async list(options: { limit?: number; offset?: number } = {}): Promise<Snapshot[]> {
    const { limit = 100, offset = 0 } = options;
    const results = await this.db.select(snapshots);
    return results
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(offset, offset + limit);
  }

  /**
   * Count snapshots by domain
   */
  async countByDomain(domainId: string): Promise<number> {
    const results = await this.db.selectWhere(snapshots, eq(snapshots.domainId, domainId));
    return results.length;
  }

  /**
   * Update snapshot's ruleset version ID
   *
   * Called after findings evaluation to mark the snapshot as having been
   * analyzed with a specific ruleset version. This allows downstream consumers
   * to distinguish between "no findings" (empty but evaluated) and
   * "findings not yet evaluated" (rulesetVersionId is null).
   */
  async updateRulesetVersion(id: string, rulesetVersionId: string): Promise<Snapshot | undefined> {
    return this.db.updateOne(snapshots, { rulesetVersionId }, eq(snapshots.id, id));
  }
}
