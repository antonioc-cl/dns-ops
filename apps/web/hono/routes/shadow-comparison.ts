/**
 * Shadow Comparison API Routes - Bead 09/12
 *
 * Exposes shadow comparison engine for legacy tool parity validation.
 * Enables safe cutover by comparing new rules against legacy outputs.
 *
 * Bead 12: Updated to use durable database storage instead of in-memory store.
 */

import {
  LegacyAccessLogRepository,
  MismatchReportRepository,
  ProviderBaselineRepository,
  ShadowComparisonRepository,
  SnapshotRepository,
  TemplateOverrideRepository,
} from '@dns-ops/db';
import type {
  LegacyToolOutput as DBLegacyToolOutput,
  FieldComparison,
  ProviderBaseline,
  TemplateOverride,
} from '@dns-ops/db/schema';
import { findings as findingsTable } from '@dns-ops/db/schema';
import { type LegacyToolOutput, shadowComparator } from '@dns-ops/rules';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { requireAdminAccess, requireAuth } from '../middleware/authorization.js';
import type { Env } from '../types.js';

export const shadowComparisonRoutes = new Hono<Env>();

// Apply authentication to all shadow comparison routes
shadowComparisonRoutes.use('*', requireAuth);

/**
 * POST /api/shadow-comparison/compare
 * Compare new findings against legacy tool output (persisted durably)
 */
shadowComparisonRoutes.post('/compare', async (c) => {
  const db = c.get('db');
  const body = await c.req.json().catch(() => ({}));
  const { snapshotId, legacyOutput } = body;

  if (!snapshotId || !legacyOutput) {
    return c.json(
      {
        error: 'Missing required fields',
        required: ['snapshotId', 'legacyOutput'],
      },
      400
    );
  }

  try {
    // Initialize repositories
    const snapshotRepo = new SnapshotRepository(db);
    const shadowRepo = new ShadowComparisonRepository(db);
    const legacyLogRepo = new LegacyAccessLogRepository(db);

    const snapshot = await snapshotRepo.findById(snapshotId);
    if (!snapshot) {
      return c.json({ error: 'Snapshot not found' }, 404);
    }

    const findings = await db.selectWhere(findingsTable, eq(findingsTable.snapshotId, snapshotId));

    // Validate legacy output format
    const validatedLegacy = validateLegacyOutput(legacyOutput);
    if (!validatedLegacy.valid || !validatedLegacy.data) {
      return c.json(
        {
          error: 'Invalid legacy output format',
          details: validatedLegacy.errors,
        },
        400
      );
    }

    // Log the legacy access
    await legacyLogRepo.log({
      toolType: 'dmarc-check',
      domain: snapshot.domainName,
      requestSource: 'api',
      responseStatus: 'success',
      outputSummary: {
        dmarcPresent: validatedLegacy.data.dmarc.present,
        dmarcValid: validatedLegacy.data.dmarc.valid,
        spfPresent: validatedLegacy.data.spf.present,
        spfValid: validatedLegacy.data.spf.valid,
        dkimPresent: validatedLegacy.data.dkim.present,
        dkimValid: validatedLegacy.data.dkim.valid,
      },
      snapshotId,
    });

    // Perform comparison using the rules engine comparator
    // Convert checkedAt to Date if string
    const legacyForComparator = {
      ...validatedLegacy.data,
      checkedAt:
        typeof validatedLegacy.data.checkedAt === 'string'
          ? new Date(validatedLegacy.data.checkedAt)
          : validatedLegacy.data.checkedAt,
    };
    const result = shadowComparator.compare(
      snapshotId,
      snapshot.domainName,
      findings,
      legacyForComparator
    );

    // Store the comparison durably in the database
    // Convert legacyOutput to DB format (preserving checkedAt as-is)
    const stored = await shadowRepo.create({
      snapshotId,
      domain: snapshot.domainName,
      comparedAt: new Date(),
      status: result.status as 'match' | 'mismatch' | 'partial-match' | 'error',
      comparisons: result.comparisons as FieldComparison[],
      metrics: result.metrics,
      summary: result.summary,
      legacyOutput: validatedLegacy.data as DBLegacyToolOutput,
    });

    return c.json({
      comparison: stored,
      summary: result.summary,
      status: result.status,
      metrics: result.metrics,
      persisted: true, // Indicates durable storage
    });
  } catch (error) {
    console.error('Shadow comparison error:', error);
    return c.json(
      {
        error: 'Failed to perform shadow comparison',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /api/shadow-comparison/stats
 * Get shadow comparison statistics (from durable storage)
 */
shadowComparisonRoutes.get('/stats', async (c) => {
  const db = c.get('db');

  try {
    const shadowRepo = new ShadowComparisonRepository(db);
    const stats = await shadowRepo.getStats();
    const pending = await shadowRepo.findPendingAdjudications();

    return c.json({
      stats,
      pendingAdjudication: pending.length,
      recentMismatches: pending.slice(0, 10).map((m) => ({
        id: m.id,
        domain: m.domain,
        status: m.status,
        summary: m.summary,
        comparedAt: m.comparedAt,
      })),
      durable: true, // Indicates data is persisted
    });
  } catch (error) {
    console.error('Shadow stats error:', error);
    return c.json(
      {
        error: 'Failed to get shadow comparison statistics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /api/shadow-comparison/:id
 * Get a specific comparison by ID
 */
shadowComparisonRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = c.get('db');

  try {
    const shadowRepo = new ShadowComparisonRepository(db);
    const comparison = await shadowRepo.findById(id);

    if (!comparison) {
      return c.json({ error: 'Comparison not found' }, 404);
    }

    return c.json({ comparison });
  } catch (error) {
    console.error('Shadow comparison get error:', error);
    return c.json(
      {
        error: 'Failed to get shadow comparison',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /api/shadow-comparison/:id/adjudicate
 * Adjudicate a shadow comparison mismatch (persisted)
 */
shadowComparisonRoutes.post('/:id/adjudicate', requireAdminAccess, async (c) => {
  const id = c.req.param('id');
  const db = c.get('db');
  const body = await c.req.json().catch(() => ({}));
  const { adjudication, notes, operator } = body;

  const validAdjudications = [
    'new-correct',
    'legacy-correct',
    'both-wrong',
    'acceptable-difference',
  ];
  if (!adjudication || !validAdjudications.includes(adjudication)) {
    return c.json(
      {
        error: 'Invalid adjudication',
        validOptions: validAdjudications,
      },
      400
    );
  }

  try {
    const shadowRepo = new ShadowComparisonRepository(db);
    const updated = await shadowRepo.adjudicate(
      id,
      operator || 'unknown',
      adjudication as 'new-correct' | 'legacy-correct' | 'both-wrong' | 'acceptable-difference',
      notes
    );

    if (!updated) {
      return c.json({ error: 'Comparison not found' }, 404);
    }

    return c.json({
      message: 'Adjudication recorded and persisted',
      comparison: updated,
    });
  } catch (error) {
    console.error('Shadow adjudication error:', error);
    return c.json(
      {
        error: 'Failed to adjudicate shadow comparison',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /api/shadow-comparison/domain/:domain
 * Get comparisons for a specific domain
 */
shadowComparisonRoutes.get('/domain/:domain', async (c) => {
  const domain = c.req.param('domain');
  const db = c.get('db');

  try {
    const shadowRepo = new ShadowComparisonRepository(db);
    const comparisons = await shadowRepo.findByDomain(domain);

    return c.json({
      domain,
      count: comparisons.length,
      comparisons: comparisons.map((comp) => ({
        id: comp.id,
        status: comp.status,
        summary: comp.summary,
        comparedAt: comp.comparedAt,
        adjudication: comp.adjudication,
      })),
    });
  } catch (error) {
    console.error('Shadow domain lookup error:', error);
    return c.json(
      {
        error: 'Failed to get domain comparisons',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /api/shadow-comparison/legacy-logs
 * Get legacy access logs
 */
shadowComparisonRoutes.get('/legacy-logs', async (c) => {
  const db = c.get('db');
  const limit = Number.parseInt(c.req.query('limit') || '50', 10);

  try {
    const legacyLogRepo = new LegacyAccessLogRepository(db);
    const logs = await legacyLogRepo.getRecent(limit);
    const stats = await legacyLogRepo.getStats();

    return c.json({
      logs: logs.map((l) => ({
        id: l.id,
        toolType: l.toolType,
        domain: l.domain,
        requestedAt: l.requestedAt,
        responseStatus: l.responseStatus,
        outputSummary: l.outputSummary,
      })),
      stats,
    });
  } catch (error) {
    console.error('Legacy logs error:', error);
    return c.json(
      {
        error: 'Failed to get legacy access logs',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * Apply template overrides to a provider baseline
 * Overrides can modify baseline properties like dkimSelectors, mxPatterns, spfIncludes
 */
function applyOverrides(
  baseline: ProviderBaseline,
  overrides: TemplateOverride[],
  domainName?: string
): ProviderBaseline & { overridesApplied: string[] } {
  const result = { ...baseline };
  const overridesApplied: string[] = [];

  for (const override of overrides) {
    // Check if override applies to this domain (if domainName specified)
    if (
      domainName &&
      override.appliesToDomains &&
      override.appliesToDomains.length > 0 &&
      !override.appliesToDomains.includes(domainName)
    ) {
      continue;
    }

    // Merge override data into baseline
    const overrideData = override.overrideData as Record<string, unknown>;

    // Apply specific override fields
    if (overrideData.dkimSelectors && Array.isArray(overrideData.dkimSelectors)) {
      result.dkimSelectors = overrideData.dkimSelectors as string[];
    }
    if (overrideData.mxPatterns && Array.isArray(overrideData.mxPatterns)) {
      result.mxPatterns = overrideData.mxPatterns as string[];
    }
    if (overrideData.spfIncludes && Array.isArray(overrideData.spfIncludes)) {
      result.spfIncludes = overrideData.spfIncludes as string[];
    }

    // Merge baseline object (deep merge for nested properties)
    if (overrideData.baseline && typeof overrideData.baseline === 'object') {
      result.baseline = {
        ...(result.baseline as Record<string, unknown>),
        ...(overrideData.baseline as Record<string, unknown>),
      };
    }

    overridesApplied.push(override.id);
  }

  return { ...result, overridesApplied };
}

/**
 * GET /api/shadow-comparison/provider-baselines
 * Get active provider baselines with template overrides applied
 *
 * Query params:
 *   - tenantId: Filter overrides by tenant (optional)
 *   - domainName: Apply only domain-specific overrides (optional)
 */
shadowComparisonRoutes.get('/provider-baselines', async (c) => {
  const db = c.get('db');
  const tenantId = c.req.query('tenantId');
  const domainName = c.req.query('domainName');

  try {
    const baselineRepo = new ProviderBaselineRepository(db);
    const overrideRepo = new TemplateOverrideRepository(db);

    const baselines = await baselineRepo.findActive();

    // Apply template overrides to each baseline
    const baselinesWithOverrides = await Promise.all(
      baselines.map(async (b) => {
        const overrides = await overrideRepo.findByProvider(b.providerKey, tenantId);
        const withOverrides = applyOverrides(b, overrides, domainName);

        return {
          providerKey: withOverrides.providerKey,
          providerName: withOverrides.providerName,
          baseline: withOverrides.baseline,
          dkimSelectors: withOverrides.dkimSelectors,
          mxPatterns: withOverrides.mxPatterns,
          spfIncludes: withOverrides.spfIncludes,
          version: withOverrides.version,
          overridesApplied: withOverrides.overridesApplied,
        };
      })
    );

    return c.json({
      baselines: baselinesWithOverrides,
      overridesActive: baselinesWithOverrides.some((b) => b.overridesApplied.length > 0),
    });
  } catch (error) {
    console.error('Provider baselines error:', error);
    return c.json(
      {
        error: 'Failed to get provider baselines',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /api/shadow-comparison/provider-baselines/:providerKey
 * Get a specific provider baseline with template overrides applied
 *
 * Query params:
 *   - tenantId: Filter overrides by tenant (optional)
 *   - domainName: Apply only domain-specific overrides (optional)
 */
shadowComparisonRoutes.get('/provider-baselines/:providerKey', async (c) => {
  const providerKey = c.req.param('providerKey');
  const db = c.get('db');
  const tenantId = c.req.query('tenantId');
  const domainName = c.req.query('domainName');

  try {
    const baselineRepo = new ProviderBaselineRepository(db);
    const overrideRepo = new TemplateOverrideRepository(db);

    const baseline = await baselineRepo.findByProviderKey(providerKey);

    if (!baseline) {
      return c.json({ error: 'Provider baseline not found' }, 404);
    }

    // Apply template overrides
    const overrides = await overrideRepo.findByProvider(providerKey, tenantId);
    const withOverrides = applyOverrides(baseline, overrides, domainName);

    return c.json({
      baseline: withOverrides,
      overridesApplied: withOverrides.overridesApplied,
    });
  } catch (error) {
    console.error('Provider baseline error:', error);
    return c.json(
      {
        error: 'Failed to get provider baseline',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /api/shadow-comparison/mismatch-report
 * Generate a mismatch report for cutover decision
 */
shadowComparisonRoutes.post('/mismatch-report', requireAdminAccess, async (c) => {
  const db = c.get('db');
  const body = await c.req.json().catch(() => ({}));
  const { domain, periodStart, periodEnd, generatedBy } = body;

  if (!domain) {
    return c.json({ error: 'Domain is required' }, 400);
  }

  try {
    const shadowRepo = new ShadowComparisonRepository(db);
    const reportRepo = new MismatchReportRepository(db);

    const start = periodStart
      ? new Date(periodStart)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = periodEnd ? new Date(periodEnd) : new Date();

    const report = await reportRepo.generateReport(
      shadowRepo,
      domain,
      start,
      end,
      generatedBy || 'system'
    );

    return c.json({
      report,
      message: report.cutoverReady
        ? 'Domain is ready for cutover'
        : 'Domain does not meet cutover threshold',
    });
  } catch (error) {
    console.error('Mismatch report error:', error);
    return c.json(
      {
        error: 'Failed to generate mismatch report',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /api/shadow-comparison/mismatch-reports/:domain
 * Get mismatch reports for a domain
 */
shadowComparisonRoutes.get('/mismatch-reports/:domain', async (c) => {
  const domain = c.req.param('domain');
  const db = c.get('db');

  try {
    const reportRepo = new MismatchReportRepository(db);
    const reports = await reportRepo.findByDomain(domain);
    const latest = reports[0];

    return c.json({
      domain,
      reports: reports.map((r) => ({
        id: r.id,
        periodStart: r.periodStart,
        periodEnd: r.periodEnd,
        matchRate: r.matchRate,
        cutoverReady: r.cutoverReady,
        generatedAt: r.generatedAt,
      })),
      latestReport: latest
        ? {
            matchRate: latest.matchRate,
            cutoverReady: latest.cutoverReady,
            totalComparisons: latest.totalComparisons,
            mismatchBreakdown: latest.mismatchBreakdown,
            cutoverNotes: latest.cutoverNotes,
          }
        : null,
    });
  } catch (error) {
    console.error('Mismatch reports error:', error);
    return c.json(
      {
        error: 'Failed to get mismatch reports',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /api/shadow-comparison/seed-baselines
 * Seed default provider baselines (admin only)
 */
shadowComparisonRoutes.post('/seed-baselines', requireAdminAccess, async (c) => {
  const db = c.get('db');

  try {
    const baselineRepo = new ProviderBaselineRepository(db);
    await baselineRepo.seedDefaults();

    const baselines = await baselineRepo.findAll();

    return c.json({
      message: 'Provider baselines seeded',
      count: baselines.length,
      providers: baselines.map((b) => b.providerKey),
    });
  } catch (error) {
    console.error('Seed baselines error:', error);
    return c.json(
      {
        error: 'Failed to seed provider baselines',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// =============================================================================
// Helper Functions
// =============================================================================

function validateLegacyOutput(output: unknown): {
  valid: boolean;
  data?: LegacyToolOutput;
  errors?: string[];
} {
  const errors: string[] = [];

  if (!output || typeof output !== 'object') {
    return { valid: false, errors: ['Legacy output must be an object'] };
  }

  const obj = output as Record<string, unknown>;

  // Check required fields
  if (!obj.domain || typeof obj.domain !== 'string') {
    errors.push('domain is required and must be a string');
  }

  if (!obj.dmarc || typeof obj.dmarc !== 'object') {
    errors.push('dmarc is required and must be an object');
  }

  if (!obj.spf || typeof obj.spf !== 'object') {
    errors.push('spf is required and must be an object');
  }

  if (!obj.dkim || typeof obj.dkim !== 'object') {
    errors.push('dkim is required and must be an object');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, data: output as LegacyToolOutput };
}
