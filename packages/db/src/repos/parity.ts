/**
 * Parity Evidence Repository - Bead 12
 *
 * Handles persistence of shadow comparison and parity evidence:
 * - Shadow comparisons (durable, not process-local)
 * - Legacy access logs
 * - Provider baselines (read-only reference data)
 * - Mismatch reports
 */

import { eq } from 'drizzle-orm';
import type { IDatabaseAdapter } from '../database/index.js';
import {
  type FieldComparison,
  type LegacyAccessLog,
  legacyAccessLogs,
  type MismatchReport,
  mismatchReports,
  type NewLegacyAccessLog,
  type NewMismatchReport,
  type NewProviderBaseline,
  type NewShadowComparison,
  type ProviderBaseline,
  providerBaselines,
  type ShadowComparison,
  shadowComparisons,
} from '../schema/parity.js';

// =============================================================================
// SHADOW COMPARISON REPOSITORY
// =============================================================================

export class ShadowComparisonRepository {
  constructor(private db: IDatabaseAdapter) {}

  /**
   * Store a new shadow comparison
   */
  async create(data: NewShadowComparison): Promise<ShadowComparison> {
    return this.db.insert(shadowComparisons, data);
  }

  /**
   * Find a comparison by ID
   */
  async findById(id: string): Promise<ShadowComparison | undefined> {
    return this.db.selectOne(shadowComparisons, eq(shadowComparisons.id, id));
  }

  /**
   * Find comparisons by snapshot ID
   */
  async findBySnapshotId(snapshotId: string): Promise<ShadowComparison[]> {
    return this.db.selectWhere(shadowComparisons, eq(shadowComparisons.snapshotId, snapshotId));
  }

  /**
   * Find comparisons by domain
   */
  async findByDomain(domain: string): Promise<ShadowComparison[]> {
    const results = await this.db.selectWhere(
      shadowComparisons,
      eq(shadowComparisons.domain, domain)
    );
    // Sort by comparedAt descending
    results.sort((a, b) => new Date(b.comparedAt).getTime() - new Date(a.comparedAt).getTime());
    return results;
  }

  /**
   * Find all mismatches (status is 'mismatch' or 'partial-match')
   */
  async findMismatches(): Promise<ShadowComparison[]> {
    const all = await this.db.select(shadowComparisons);
    return all.filter((c) => c.status === 'mismatch' || c.status === 'partial-match');
  }

  /**
   * Find pending adjudications (mismatches without adjudication)
   */
  async findPendingAdjudications(): Promise<ShadowComparison[]> {
    const mismatches = await this.findMismatches();
    return mismatches.filter((c) => !c.adjudication);
  }

  /**
   * Adjudicate a comparison
   */
  async adjudicate(
    id: string,
    acknowledgedBy: string,
    adjudication: ShadowComparison['adjudication'],
    notes?: string
  ): Promise<ShadowComparison | undefined> {
    const existing = await this.findById(id);
    if (!existing) return undefined;

    const results = await this.db.update(
      shadowComparisons,
      {
        acknowledgedAt: new Date(),
        acknowledgedBy,
        adjudication,
        adjudicationNotes: notes,
      },
      eq(shadowComparisons.id, id)
    );

    return results[0];
  }

  /**
   * Get statistics for all comparisons
   */
  async getStats(): Promise<{
    total: number;
    matches: number;
    mismatches: number;
    partialMatches: number;
    acknowledged: number;
    pending: number;
  }> {
    const all = await this.db.select(shadowComparisons);
    return {
      total: all.length,
      matches: all.filter((c) => c.status === 'match').length,
      mismatches: all.filter((c) => c.status === 'mismatch').length,
      partialMatches: all.filter((c) => c.status === 'partial-match').length,
      acknowledged: all.filter((c) => c.acknowledgedAt).length,
      pending: all.filter((c) => !c.acknowledgedAt && c.status !== 'match').length,
    };
  }

  /**
   * Get recent comparisons (last N)
   */
  async getRecent(limit = 50): Promise<ShadowComparison[]> {
    const all = await this.db.select(shadowComparisons);
    // Sort by comparedAt descending
    all.sort((a, b) => new Date(b.comparedAt).getTime() - new Date(a.comparedAt).getTime());
    return all.slice(0, limit);
  }
}

// =============================================================================
// LEGACY ACCESS LOG REPOSITORY
// =============================================================================

export class LegacyAccessLogRepository {
  constructor(private db: IDatabaseAdapter) {}

  /**
   * Log a legacy tool access
   */
  async log(data: NewLegacyAccessLog): Promise<LegacyAccessLog> {
    return this.db.insert(legacyAccessLogs, data);
  }

  /**
   * Find logs by domain
   */
  async findByDomain(domain: string): Promise<LegacyAccessLog[]> {
    const results = await this.db.selectWhere(
      legacyAccessLogs,
      eq(legacyAccessLogs.domain, domain)
    );
    // Sort by requestedAt descending
    results.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    return results;
  }

  /**
   * Find logs by tool type
   */
  async findByToolType(toolType: LegacyAccessLog['toolType']): Promise<LegacyAccessLog[]> {
    if (!toolType) return [];
    return this.db.selectWhere(legacyAccessLogs, eq(legacyAccessLogs.toolType, toolType));
  }

  /**
   * Find logs associated with a snapshot
   */
  async findBySnapshotId(snapshotId: string): Promise<LegacyAccessLog[]> {
    return this.db.selectWhere(legacyAccessLogs, eq(legacyAccessLogs.snapshotId, snapshotId));
  }

  /**
   * Get recent logs (last N)
   */
  async getRecent(limit = 100): Promise<LegacyAccessLog[]> {
    const all = await this.db.select(legacyAccessLogs);
    // Sort by requestedAt descending
    all.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    return all.slice(0, limit);
  }

  /**
   * Get access statistics
   */
  async getStats(): Promise<{
    total: number;
    byToolType: Record<string, number>;
    successRate: number;
    last24h: number;
  }> {
    const all = await this.db.select(legacyAccessLogs);
    const byToolType: Record<string, number> = {};

    for (const log of all) {
      const type = log.toolType || 'unknown';
      byToolType[type] = (byToolType[type] || 0) + 1;
    }

    const successful = all.filter((l) => l.responseStatus === 'success').length;
    const last24h = all.filter(
      (l) => new Date(l.requestedAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length;

    return {
      total: all.length,
      byToolType,
      successRate: all.length > 0 ? (successful / all.length) * 100 : 0,
      last24h,
    };
  }
}

// =============================================================================
// PROVIDER BASELINE REPOSITORY
// =============================================================================

export class ProviderBaselineRepository {
  constructor(private db: IDatabaseAdapter) {}

  /**
   * Get all active baselines
   */
  async findActive(): Promise<ProviderBaseline[]> {
    return this.db.selectWhere(providerBaselines, eq(providerBaselines.status, 'active'));
  }

  /**
   * Get baseline by provider key
   */
  async findByProviderKey(providerKey: string): Promise<ProviderBaseline | undefined> {
    return this.db.selectOne(providerBaselines, eq(providerBaselines.providerKey, providerKey));
  }

  /**
   * Get all baselines (including deprecated)
   */
  async findAll(): Promise<ProviderBaseline[]> {
    return this.db.select(providerBaselines);
  }

  /**
   * Create a new baseline (admin only)
   */
  async create(data: NewProviderBaseline): Promise<ProviderBaseline> {
    return this.db.insert(providerBaselines, data);
  }

  /**
   * Update a baseline (admin only)
   */
  async update(
    id: string,
    data: Partial<NewProviderBaseline>
  ): Promise<ProviderBaseline | undefined> {
    const results = await this.db.update(
      providerBaselines,
      { ...data, updatedAt: new Date() },
      eq(providerBaselines.id, id)
    );
    return results[0];
  }

  /**
   * Deprecate a baseline
   */
  async deprecate(id: string): Promise<ProviderBaseline | undefined> {
    const results = await this.db.update(
      providerBaselines,
      { status: 'deprecated', updatedAt: new Date() },
      eq(providerBaselines.id, id)
    );
    return results[0];
  }

  /**
   * Seed default provider baselines
   */
  async seedDefaults(): Promise<void> {
    const defaults: NewProviderBaseline[] = [
      {
        providerKey: 'google-workspace',
        providerName: 'Google Workspace',
        status: 'active',
        baseline: {
          dmarc: {
            expectedPolicy: 'quarantine',
            requiresRua: true,
          },
          spf: {
            requiredIncludes: ['_spf.google.com'],
          },
          dkim: {
            requiredSelectors: ['google'],
            keyType: 'rsa',
          },
          mx: {
            expectedHosts: [
              'aspmx.l.google.com',
              'alt1.aspmx.l.google.com',
              'alt2.aspmx.l.google.com',
            ],
          },
        },
        dkimSelectors: ['google'],
        mxPatterns: ['*.google.com', '*.googlemail.com'],
        spfIncludes: ['_spf.google.com'],
        version: '1.0.0',
      },
      {
        providerKey: 'microsoft-365',
        providerName: 'Microsoft 365',
        status: 'active',
        baseline: {
          dmarc: {
            expectedPolicy: 'quarantine',
            requiresRua: true,
          },
          spf: {
            requiredIncludes: ['spf.protection.outlook.com'],
          },
          dkim: {
            requiredSelectors: ['selector1', 'selector2'],
            keyType: 'rsa',
          },
          mx: {
            expectedHosts: ['*.mail.protection.outlook.com'],
          },
        },
        dkimSelectors: ['selector1', 'selector2'],
        mxPatterns: ['*.mail.protection.outlook.com'],
        spfIncludes: ['spf.protection.outlook.com'],
        version: '1.0.0',
      },
      {
        providerKey: 'amazon-ses',
        providerName: 'Amazon SES',
        status: 'active',
        baseline: {
          dmarc: {
            expectedPolicy: 'none',
          },
          spf: {
            requiredIncludes: ['amazonses.com'],
          },
          dkim: {
            keyType: 'rsa',
            keySize: 2048,
          },
        },
        dkimSelectors: [],
        mxPatterns: ['*.amazonses.com'],
        spfIncludes: ['amazonses.com'],
        version: '1.0.0',
      },
      {
        providerKey: 'sendgrid',
        providerName: 'SendGrid',
        status: 'active',
        baseline: {
          spf: {
            requiredIncludes: ['sendgrid.net'],
          },
          dkim: {
            requiredSelectors: ['s1', 's2'],
            keyType: 'rsa',
          },
        },
        dkimSelectors: ['s1', 's2', 'smtpapi', 'em1234'],
        mxPatterns: ['*.sendgrid.net'],
        spfIncludes: ['sendgrid.net'],
        version: '1.0.0',
      },
      {
        providerKey: 'mailgun',
        providerName: 'Mailgun',
        status: 'active',
        baseline: {
          spf: {
            requiredIncludes: ['mailgun.org'],
          },
          dkim: {
            keyType: 'rsa',
          },
        },
        dkimSelectors: ['mailo', 'mg'],
        mxPatterns: ['*.mailgun.org'],
        spfIncludes: ['mailgun.org'],
        version: '1.0.0',
      },
    ];

    for (const baseline of defaults) {
      const existing = await this.findByProviderKey(baseline.providerKey);
      if (!existing) {
        await this.create(baseline);
      }
    }
  }
}

// =============================================================================
// MISMATCH REPORT REPOSITORY
// =============================================================================

export class MismatchReportRepository {
  constructor(private db: IDatabaseAdapter) {}

  /**
   * Create a new mismatch report
   */
  async create(data: NewMismatchReport): Promise<MismatchReport> {
    return this.db.insert(mismatchReports, data);
  }

  /**
   * Find reports by domain
   */
  async findByDomain(domain: string): Promise<MismatchReport[]> {
    const results = await this.db.selectWhere(
      mismatchReports,
      eq(mismatchReports.domain, domain)
    );
    results.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
    return results;
  }

  /**
   * Find cutover-ready domains
   */
  async findCutoverReady(): Promise<MismatchReport[]> {
    return this.db.selectWhere(mismatchReports, eq(mismatchReports.cutoverReady, true));
  }

  /**
   * Get latest report for a domain
   */
  async getLatestForDomain(domain: string): Promise<MismatchReport | undefined> {
    const reports = await this.findByDomain(domain);
    return reports[0];
  }

  /**
   * Generate a report from shadow comparisons
   */
  async generateReport(
    shadowComparisonRepo: ShadowComparisonRepository,
    domain: string,
    periodStart: Date,
    periodEnd: Date,
    generatedBy: string
  ): Promise<MismatchReport> {
    const comparisons = await shadowComparisonRepo.findByDomain(domain);

    // Filter by period
    const periodComparisons = comparisons.filter((c) => {
      const comparedAt = new Date(c.comparedAt);
      return comparedAt >= periodStart && comparedAt <= periodEnd;
    });

    const matchCount = periodComparisons.filter((c) => c.status === 'match').length;
    const mismatchCount = periodComparisons.filter((c) => c.status === 'mismatch').length;
    const partialMatchCount = periodComparisons.filter((c) => c.status === 'partial-match').length;
    const adjudicatedCount = periodComparisons.filter((c) => c.adjudication).length;
    const pendingCount = periodComparisons.filter(
      (c) => !c.adjudication && c.status !== 'match'
    ).length;

    // Calculate mismatch breakdown
    const mismatchBreakdown = {
      dmarcPresent: 0,
      dmarcValid: 0,
      dmarcPolicy: 0,
      spfPresent: 0,
      spfValid: 0,
      dkimPresent: 0,
      dkimValid: 0,
    };

    for (const c of periodComparisons) {
      const fieldComparisons = c.comparisons as FieldComparison[];
      for (const fc of fieldComparisons) {
        if (fc.status === 'mismatch') {
          const key = fc.field.replace(/-/g, '') as keyof typeof mismatchBreakdown;
          if (key in mismatchBreakdown) {
            mismatchBreakdown[key]++;
          }
        }
      }
    }

    const total = periodComparisons.length;
    const matchRate = total > 0 ? `${((matchCount / total) * 100).toFixed(1)}%` : '0%';
    const cutoverReady = total >= 10 && matchCount / total >= 0.95;

    const reportData: NewMismatchReport = {
      domain,
      periodStart,
      periodEnd,
      totalComparisons: total,
      matchCount,
      mismatchCount,
      partialMatchCount,
      mismatchBreakdown,
      adjudicatedCount,
      pendingCount,
      matchRate,
      cutoverReady,
      cutoverNotes: cutoverReady
        ? 'Meets 95% match threshold with sufficient sample size'
        : `Match rate ${matchRate} does not meet 95% threshold or insufficient samples`,
      generatedBy,
    };

    return this.create(reportData);
  }
}
