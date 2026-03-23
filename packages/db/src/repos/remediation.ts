/**
 * Remediation Request Repository
 *
 * Database operations for remediation requests.
 */

import { eq } from 'drizzle-orm';
import type { IDatabaseAdapter } from '../database/simple-adapter.js';
import {
  type NewRemediationRequest,
  type RemediationRequest,
  remediationRequests,
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
   * Find remediation request by ID within tenant scope
   */
  async findById(id: string, tenantId: string): Promise<RemediationRequest | null> {
    const result = await this.db.selectOne(remediationRequests, eq(remediationRequests.id, id));
    if (!result || result.tenantId !== tenantId) {
      return null;
    }
    return result;
  }

  /**
   * Find all remediation requests for a domain within tenant scope
   */
  async findByDomain(domain: string, tenantId: string): Promise<RemediationRequest[]> {
    const results = await this.db.selectWhere(
      remediationRequests,
      eq(remediationRequests.domain, domain)
    );
    return results
      .filter((request) => request.tenantId === tenantId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Find remediation requests by snapshot ID within tenant scope
   */
  async findBySnapshotId(snapshotId: string, tenantId: string): Promise<RemediationRequest[]> {
    const results = await this.db.selectWhere(
      remediationRequests,
      eq(remediationRequests.snapshotId, snapshotId)
    );
    return results
      .filter((request) => request.tenantId === tenantId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Find remediation requests by status within tenant scope
   */
  async findByStatus(
    status: RemediationRequest['status'],
    tenantId: string,
    limit?: number
  ): Promise<RemediationRequest[]> {
    const results = await this.db.selectWhere(
      remediationRequests,
      eq(remediationRequests.status, status)
    );
    return results
      .filter((request) => request.tenantId === tenantId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  /**
   * Update remediation request status within tenant scope
   */
  async updateStatus(
    id: string,
    tenantId: string,
    status: RemediationRequest['status'],
    options?: {
      assignedTo?: string;
      notes?: string;
    }
  ): Promise<RemediationRequest | null> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      return null;
    }

    const updates: Partial<NewRemediationRequest> = {
      status,
      updatedAt: new Date(),
    };

    if (options?.assignedTo !== undefined) {
      updates.assignedTo = options.assignedTo;
    }

    if (options?.notes !== undefined) {
      updates.notes = options.notes;
    }

    if (status === 'resolved') {
      updates.resolvedAt = new Date();
    }

    if (status === 'closed') {
      updates.resolvedAt = existing.resolvedAt ?? new Date();
    }

    const result = await this.db.updateOne(
      remediationRequests,
      updates,
      eq(remediationRequests.id, id)
    );
    return result ?? null;
  }

  /**
   * Close a remediation request within tenant scope
   */
  async close(id: string, tenantId: string, reason?: string): Promise<RemediationRequest | null> {
    return this.updateStatus(id, tenantId, 'closed', { notes: reason });
  }

  /**
   * List remediation requests with filtering within tenant scope
   */
  async list(
    tenantId: string,
    options?: {
      domains?: string[];
      statuses?: RemediationRequest['status'][];
      priorities?: RemediationRequest['priority'][];
      limit?: number;
      offset?: number;
    }
  ): Promise<RemediationRequest[]> {
    let results = await this.db.select(remediationRequests);

    results = results.filter((request) => request.tenantId === tenantId);

    if (options?.domains?.length) {
      results = results.filter((request) => options.domains?.includes(request.domain));
    }

    if (options?.statuses?.length) {
      results = results.filter((request) => options.statuses?.includes(request.status));
    }

    if (options?.priorities?.length) {
      results = results.filter((request) => options.priorities?.includes(request.priority));
    }

    results = results.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const offset = options?.offset || 0;
    const limit = options?.limit || results.length;

    return results.slice(offset, offset + limit);
  }

  /**
   * Count remediation requests by status within tenant scope
   */
  async countByStatus(tenantId: string): Promise<Record<RemediationRequest['status'], number>> {
    const results = await this.db.select(remediationRequests);
    const tenantResults = results.filter((request) => request.tenantId === tenantId);

    const counts = { open: 0, 'in-progress': 0, resolved: 0, closed: 0 };

    for (const row of tenantResults) {
      counts[row.status]++;
    }

    return counts;
  }
}
