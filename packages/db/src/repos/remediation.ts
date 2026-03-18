/**
 * Remediation Request Repository
 *
 * Database operations for remediation requests.
 */

import { eq, desc, and, inArray, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  remediationRequests,
  type RemediationRequest,
  type NewRemediationRequest,
} from '../schema/remediation.js';

export class RemediationRepository {
  constructor(private db: NodePgDatabase) {}

  /**
   * Create a new remediation request
   */
  async create(data: NewRemediationRequest): Promise<RemediationRequest> {
    const [result] = await this.db
      .insert(remediationRequests)
      .values(data)
      .returning();

    if (!result) {
      throw new Error('Failed to create remediation request');
    }

    return result;
  }

  /**
   * Find remediation request by ID
   */
  async findById(id: string): Promise<RemediationRequest | null> {
    const [result] = await this.db
      .select()
      .from(remediationRequests)
      .where(eq(remediationRequests.id, id));

    return result || null;
  }

  /**
   * Find all remediation requests for a domain
   */
  async findByDomain(domain: string): Promise<RemediationRequest[]> {
    return this.db
      .select()
      .from(remediationRequests)
      .where(eq(remediationRequests.domain, domain))
      .orderBy(desc(remediationRequests.createdAt));
  }

  /**
   * Find remediation requests by snapshot ID
   */
  async findBySnapshotId(snapshotId: string): Promise<RemediationRequest[]> {
    return this.db
      .select()
      .from(remediationRequests)
      .where(eq(remediationRequests.snapshotId, snapshotId))
      .orderBy(desc(remediationRequests.createdAt));
  }

  /**
   * Find remediation requests by status
   */
  async findByStatus(
    status: RemediationRequest['status'],
    limit?: number
  ): Promise<RemediationRequest[]> {
    let query = this.db
      .select()
      .from(remediationRequests)
      .where(eq(remediationRequests.status, status))
      .orderBy(desc(remediationRequests.createdAt));

    if (limit) {
      query = query.limit(limit);
    }

    return query;
  }

  /**
   * Update remediation request status
   */
  async updateStatus(
    id: string,
    status: RemediationRequest['status'],
    assignedTo?: string
  ): Promise<RemediationRequest | null> {
    const updates: Partial<NewRemediationRequest> = {
      status,
      updatedAt: new Date(),
    };

    if (assignedTo !== undefined) {
      updates.assignedTo = assignedTo;
    }

    if (status === 'resolved') {
      updates.resolvedAt = new Date();
    }

    const [result] = await this.db
      .update(remediationRequests)
      .set(updates)
      .where(eq(remediationRequests.id, id))
      .returning();

    return result || null;
  }

  /**
   * Close a remediation request
   */
  async close(id: string, reason?: string): Promise<RemediationRequest | null> {
    const [result] = await this.db
      .update(remediationRequests)
      .set({
        status: 'closed',
        notes: reason,
        updatedAt: new Date(),
      })
      .where(eq(remediationRequests.id, id))
      .returning();

    return result || null;
  }

  /**
   * List remediation requests with filtering
   */
  async list(options?: {
    domains?: string[];
    statuses?: RemediationRequest['status'][];
    priorities?: RemediationRequest['priority'][];
    limit?: number;
    offset?: number;
  }): Promise<RemediationRequest[]> {
    let conditions = [];

    if (options?.domains?.length) {
      conditions.push(inArray(remediationRequests.domain, options.domains));
    }

    if (options?.statuses?.length) {
      conditions.push(inArray(remediationRequests.status, options.statuses));
    }

    if (options?.priorities?.length) {
      conditions.push(inArray(remediationRequests.priority, options.priorities));
    }

    let query = this.db
      .select()
      .from(remediationRequests)
      .orderBy(desc(remediationRequests.createdAt));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.offset(options.offset);
    }

    return query;
  }

  /**
   * Count remediation requests by status
   */
  async countByStatus(): Promise<Record<RemediationRequest['status'], number>> {
    const results = await this.db
      .select({
        status: remediationRequests.status,
        count: sql<number>`count(*)`,
      })
      .from(remediationRequests)
      .groupBy(remediationRequests.status);

    return results.reduce<
      Record<RemediationRequest['status'], number>
    >(
      (acc, row: { status: RemediationRequest['status']; count: number | bigint }) => {
        acc[row.status] = Number(row.count);
        return acc;
      },
      { open: 0, 'in-progress': 0, resolved: 0, closed: 0 }
    );
  }
}
