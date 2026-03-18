/**
 * Shadow Comparison API Routes - Bead 09
 *
 * Exposes shadow comparison engine for legacy tool parity validation.
 * Enables safe cutover by comparing new rules against legacy outputs.
 */

import { Hono } from 'hono';
import type { Env } from '../types';
import { shadowComparator, shadowStore, type LegacyToolOutput } from '@dns-ops/rules';
import { FindingRepository, SnapshotRepository } from '@dns-ops/db/repos';

export const shadowComparisonRoutes = new Hono<Env>();

/**
 * POST /api/shadow-comparison/compare
 * Compare new findings against legacy tool output
 */
shadowComparisonRoutes.post('/compare', async (c) => {
  const db = c.get('db');
  const body = await c.req.json().catch(() => ({}));
  const { snapshotId, legacyOutput } = body;

  if (!snapshotId || !legacyOutput) {
    return c.json({
      error: 'Missing required fields',
      required: ['snapshotId', 'legacyOutput'],
    }, 400);
  }

  try {
    // Fetch findings for this snapshot
    const findingRepo = new FindingRepository(db);
    const snapshotRepo = new SnapshotRepository(db);

    const snapshot = await snapshotRepo.findById(snapshotId);
    if (!snapshot) {
      return c.json({ error: 'Snapshot not found' }, 404);
    }

    const findings = await findingRepo.findBySnapshotId(snapshotId);

    // Validate legacy output format
    const validatedLegacy = validateLegacyOutput(legacyOutput);
    if (!validatedLegacy.valid) {
      return c.json({
        error: 'Invalid legacy output format',
        details: validatedLegacy.errors,
      }, 400);
    }

    // Perform comparison
    const result = shadowComparator.compare(
      snapshotId,
      snapshot.domainName,
      findings,
      validatedLegacy.data
    );

    // Store the comparison
    const stored = shadowStore.store(result);

    return c.json({
      comparison: stored,
      summary: result.summary,
      status: result.status,
      metrics: result.metrics,
    });

  } catch (error) {
    console.error('Shadow comparison error:', error);
    return c.json({
      error: 'Failed to perform shadow comparison',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * GET /api/shadow-comparison/stats
 * Get shadow comparison statistics
 */
shadowComparisonRoutes.get('/stats', async (c) => {
  try {
    const stats = shadowStore.getStats();
    const mismatches = shadowStore.getMismatches();

    return c.json({
      stats,
      pendingAdjudication: mismatches.filter(m => !m.adjudication).length,
      recentMismatches: mismatches
        .filter(m => !m.adjudication)
        .slice(0, 10)
        .map(m => ({
          id: m.id,
          domain: m.domain,
          status: m.status,
          summary: m.summary,
          comparedAt: m.comparedAt,
        })),
    });

  } catch (error) {
    console.error('Shadow stats error:', error);
    return c.json({
      error: 'Failed to get shadow comparison statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * GET /api/shadow-comparison/:id
 * Get a specific comparison by ID
 */
shadowComparisonRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');

  try {
    const comparison = shadowStore.get(id);
    if (!comparison) {
      return c.json({ error: 'Comparison not found' }, 404);
    }

    return c.json({ comparison });

  } catch (error) {
    console.error('Shadow comparison get error:', error);
    return c.json({
      error: 'Failed to get shadow comparison',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * POST /api/shadow-comparison/:id/adjudicate
 * Adjudicate a shadow comparison mismatch
 */
shadowComparisonRoutes.post('/:id/adjudicate', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const { adjudication, notes, operator } = body;

  const validAdjudications = ['new-correct', 'legacy-correct', 'both-wrong', 'acceptable-difference'];
  if (!adjudication || !validAdjudications.includes(adjudication)) {
    return c.json({
      error: 'Invalid adjudication',
      validOptions: validAdjudications,
    }, 400);
  }

  try {
    const updated = shadowStore.acknowledge(
      id,
      operator || 'unknown',
      adjudication as 'new-correct' | 'legacy-correct' | 'both-wrong' | 'acceptable-difference',
      notes
    );

    if (!updated) {
      return c.json({ error: 'Comparison not found' }, 404);
    }

    return c.json({
      message: 'Adjudication recorded',
      comparison: updated,
    });

  } catch (error) {
    console.error('Shadow adjudication error:', error);
    return c.json({
      error: 'Failed to adjudicate shadow comparison',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * GET /api/shadow-comparison/domain/:domain
 * Get comparisons for a specific domain
 */
shadowComparisonRoutes.get('/domain/:domain', async (c) => {
  const domain = c.req.param('domain');

  try {
    const comparisons = shadowStore.getByDomain(domain);
    return c.json({
      domain,
      count: comparisons.length,
      comparisons: comparisons.map(c => ({
        id: c.id,
        status: c.status,
        summary: c.summary,
        comparedAt: c.comparedAt,
        adjudication: c.adjudication,
      })),
    });

  } catch (error) {
    console.error('Shadow domain lookup error:', error);
    return c.json({
      error: 'Failed to get domain comparisons',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// =============================================================================
// Helper Functions
// =============================================================================

function validateLegacyOutput(output: unknown): { valid: boolean; data?: LegacyToolOutput; errors?: string[] } {
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
