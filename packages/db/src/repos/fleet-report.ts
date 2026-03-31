/**
 * Fleet Report Repository
 *
 * Manages persisted fleet reports for batch domain analysis.
 * Fleet reports allow operators to run batch queries across their domain portfolio.
 */

import { eq } from 'drizzle-orm';
import type { IDatabaseAdapter } from '../database/simple-adapter.js';
import { type FleetReport, type NewFleetReport, fleetReports } from '../schema/index.js';

export class FleetReportRepository {
  constructor(private db: IDatabaseAdapter) {}

  /**
   * Find a fleet report by ID
   */
  async findById(id: string): Promise<FleetReport | null> {
    const result = await this.db.selectOne(fleetReports, eq(fleetReports.id, id));
    return result || null;
  }

  /**
   * Find all fleet reports for a tenant
   */
  async findByTenant(tenantId: string, limit = 100): Promise<FleetReport[]> {
    const results = await this.db.selectWhere(fleetReports, eq(fleetReports.tenantId, tenantId));
    // Sort by createdAt descending and limit
    return results
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, limit);
  }

  /**
   * Find fleet reports by tenant with status filter
   */
  async findByTenantAndStatus(
    tenantId: string,
    status: FleetReport['status'],
    limit = 100
  ): Promise<FleetReport[]> {
    const results = await this.findByTenant(tenantId, limit * 2);
    return results.filter((r) => r.status === status).slice(0, limit);
  }

  /**
   * Create a new fleet report
   */
  async create(data: NewFleetReport): Promise<FleetReport> {
    return this.db.insert(fleetReports, data);
  }

  /**
   * Update report status to processing
   */
  async markProcessing(id: string): Promise<FleetReport | null> {
    await this.db.update(
      fleetReports,
      {
        status: 'processing',
        startedAt: new Date(),
        updatedAt: new Date(),
      },
      eq(fleetReports.id, id)
    );
    return this.findById(id);
  }

  /**
   * Complete a fleet report with results
   */
  async complete(
    id: string,
    summary: FleetReport['summary'],
    domainResults: FleetReport['domainResults']
  ): Promise<FleetReport | null> {
    await this.db.update(
      fleetReports,
      {
        status: 'completed',
        summary,
        domainResults,
        completedAt: new Date(),
        updatedAt: new Date(),
      },
      eq(fleetReports.id, id)
    );
    return this.findById(id);
  }

  /**
   * Mark a fleet report as failed
   */
  async markFailed(id: string, errorMessage: string): Promise<FleetReport | null> {
    await this.db.update(
      fleetReports,
      {
        status: 'failed',
        errorMessage,
        completedAt: new Date(),
        updatedAt: new Date(),
      },
      eq(fleetReports.id, id)
    );
    return this.findById(id);
  }

  /**
   * Delete a fleet report
   */
  async delete(id: string): Promise<boolean> {
    await this.db.delete(fleetReports, eq(fleetReports.id, id));
    return true;
  }

  /**
   * Count reports by status for a tenant
   */
  async countByStatus(tenantId: string): Promise<Record<string, number>> {
    const reports = await this.findByTenant(tenantId, 1000);
    const counts: Record<string, number> = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };
    for (const report of reports) {
      counts[report.status] = (counts[report.status] || 0) + 1;
    }
    return counts;
  }
}
