/**
 * Remediation Request Repository
 *
 * Database operations for remediation requests.
 */

import { eq } from 'drizzle-orm';
import type { IDatabaseAdapter } from '../database/simple-adapter.js';
import {
  remediationRequests,
  type RemediationRequest,
  type NewRemediationRequest,
} from '../schema/remediation.js';

export class RemediationRepository {
  constructor(private db: IDatabaseAdapter) {}

  /**
   * Create a new remediation request
   */
  async create(data: NewRemediationRequest): Promise<RemediationRequest> {
    return this.db.insert(remediationRequests, data);
  }

  /**
   * Find remediation request by ID
   */
  async findById(id: string): Promise<RemediationRequest | null> {
    const result = await this.db.selectOne(
      remediationRequests,
      eq(remediationRequests.id, id)
    );
    return result || null;
  }

  /**
   * Find all remediation requests for a domain
   */
  async findByDomain(domain: string): Promise<RemediationRequest[]> {
    const results = await this.db.selectWhere(
      remediationRequests,
      eq(remediationRequests.domain, domain)
    );
    return results.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Find remediation requests by snapshot ID
   */
  async findBySnapshotId(snapshotId: string): Promise<RemediationRequest[]> {
    const results = await this.db.selectWhere(
      remediationRequests,
      eq(remediationRequests.snapshotId, snapshotId)
    );
    return results.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Find remediation requests by status
   */
  async findByStatus(
    status: RemediationRequest['status'],
    limit?: number
  ): Promise<RemediationRequest[]> {
    const results = await this.db.selectWhere(
      remediationRequests,
      eq(remediationRequests.status, status)
    );
    return results
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
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

    const result = await this.db.updateOne(
      remediationRequests,
      updates,
      eq(remediationRequests.id, id)
    );

    return result || null;
  }

  /**
   * Close a remediation request
   */
  async close(id: string, reason?: string): Promise<RemediationRequest | null> {
    const result = await this.db.updateOne(
      remediationRequests,
      {
        status: 'closed',
        notes: reason,
        updatedAt: new Date(),
      },
      eq(remediationRequests.id, id)
    );

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
    let results = await this.db.select(remediationRequests);

    if (options?.domains?.length) {
      results = results.filter(r => options.domains!.includes(r.domain));
    }

    if (options?.statuses?.length) {
      results = results.filter(r => options.statuses!.includes(r.status));
    }

    if (options?.priorities?.length) {
      results = results.filter(r => options.priorities!.includes(r.priority));
    }

    // Sort by createdAt desc
    results = results.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Apply pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || results.length;

    return results.slice(offset, offset + limit);
  }

  /**
   * Count remediation requests by status
   */
  async countByStatus(): Promise<Record<RemediationRequest['status'], number>> {
    const results = await this.db.select(remediationRequests);

    const counts = { open: 0, 'in-progress': 0, resolved: 0, closed: 0 };

    for (const row of results) {
      counts[row.status]++;
    }

    return counts;
  }
}
