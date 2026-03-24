/**
 * Provider Template API Routes - Bead 09
 *
 * Exposes provider templates and comparison functionality.
 * Enables expected-vs-actual validation for supported mail providers.
 */

import { RecordSetRepository, SnapshotRepository } from '@dns-ops/db';
import {
  compareToTemplate,
  detectProviderFromDns,
  type KnownProvider,
  PROVIDER_TEMPLATES,
  templateStorage,
} from '@dns-ops/rules';
import { Hono } from 'hono';
import { requireAdminAccess, requireAuth } from '../middleware/authorization.js';
import { getWebLogger } from '../middleware/error-tracking.js';
import type { Env } from '../types.js';

export const providerTemplateRoutes = new Hono<Env>();

// Apply authentication to all provider template routes
providerTemplateRoutes.use('*', requireAuth);

/**
 * GET /api/mail/providers
 * List all available provider templates
 */
providerTemplateRoutes.get('/providers', async (c) => {
  try {
    const templates = templateStorage.getAllTemplates();

    return c.json({
      providers: templates.map((t) => ({
        id: t.id,
        provider: t.provider,
        name: t.name,
        description: t.description,
        version: t.version,
        knownSelectors: t.knownSelectors,
        expected: {
          mx: t.expected.mx?.length || 0,
          spf: t.expected.spf?.required || false,
          dmarc: t.expected.dmarc?.required || false,
          dkim: t.expected.dkim?.required || false,
        },
      })),
    });
  } catch (error) {
    const logger = getWebLogger();
    logger.error('Provider list error:', error instanceof Error ? error : new Error(String(error)), {
      requestId: c.req.header('X-Request-ID'),
      path: '/api/provider-templates',
      method: 'GET',
      tenantId: c.get('tenantId'),
    });
    return c.json(
      {
        error: 'Failed to list provider templates',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /api/mail/providers/:provider
 * Get details for a specific provider template
 */
providerTemplateRoutes.get('/providers/:provider', async (c) => {
  const provider = c.req.param('provider') as KnownProvider;

  try {
    const template = templateStorage.getTemplate(provider);
    if (!template) {
      return c.json(
        {
          error: 'Provider template not found',
          availableProviders: Object.keys(PROVIDER_TEMPLATES),
        },
        404
      );
    }

    return c.json({
      template: {
        id: template.id,
        provider: template.provider,
        name: template.name,
        description: template.description,
        version: template.version,
        knownSelectors: template.knownSelectors,
        expected: template.expected,
        detection: {
          mxPatterns: template.detection.mxPatterns.map((p) => p.source),
          spfPatterns: template.detection.spfPatterns.map((p) => p.source),
        },
      },
    });
  } catch (error) {
    const logger = getWebLogger();
    logger.error('Provider get error:', error instanceof Error ? error : new Error(String(error)), {
      requestId: c.req.header('X-Request-ID'),
      path: '/api/provider-templates/:provider',
      method: 'GET',
      tenantId: c.get('tenantId'),
    });
    return c.json(
      {
        error: 'Failed to get provider template',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /api/mail/compare-to-provider
 * Compare a domain's mail configuration against a provider template
 */
providerTemplateRoutes.post('/compare-to-provider', async (c) => {
  const db = c.get('db');
  const body = await c.req.json().catch(() => ({}));
  const { snapshotId, provider } = body;

  if (!snapshotId) {
    return c.json(
      {
        error: 'Missing required field: snapshotId',
      },
      400
    );
  }

  try {
    // Fetch snapshot and record sets
    const snapshotRepo = new SnapshotRepository(db);
    const recordSetRepo = new RecordSetRepository(db);

    const snapshot = await snapshotRepo.findById(snapshotId);
    if (!snapshot) {
      return c.json({ error: 'Snapshot not found' }, 404);
    }

    const recordSets = await recordSetRepo.findBySnapshotId(snapshotId);

    // Build actual configuration from record sets
    const actual = buildActualConfig(recordSets);

    // Auto-detect provider if not specified
    let targetProvider: KnownProvider = provider;
    if (!targetProvider) {
      const detection = detectProviderFromDns(actual.mx || [], actual.spf || undefined);
      targetProvider = detection.provider;
    }

    // Validate provider exists
    const template = templateStorage.getTemplate(targetProvider);
    if (!template) {
      return c.json(
        {
          error: 'Provider template not found',
          requestedProvider: targetProvider,
          availableProviders: Object.keys(PROVIDER_TEMPLATES),
        },
        404
      );
    }

    // Perform comparison
    const comparison = compareToTemplate(targetProvider, actual);

    return c.json({
      domain: snapshot.domainName,
      snapshotId,
      provider: targetProvider,
      providerName: template.name,
      detectionConfidence: provider
        ? undefined
        : detectProviderFromDns(actual.mx || [], actual.spf).confidence,
      comparison: {
        overallMatch: comparison.overallMatch,
        matches: comparison.matches,
        mismatches: comparison.mismatches,
        missing: comparison.missing,
      },
      actual,
      expected: {
        mx: template.expected.mx,
        spf: template.expected.spf,
        dkim: template.expected.dkim,
        dmarc: template.expected.dmarc,
      },
    });
  } catch (error) {
    const logger = getWebLogger();
    logger.error('Provider comparison error:', error instanceof Error ? error : new Error(String(error)), {
      requestId: c.req.header('X-Request-ID'),
      path: '/api/provider-templates/compare',
      method: 'POST',
      tenantId: c.get('tenantId'),
    });
    return c.json(
      {
        error: 'Failed to compare to provider template',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /api/mail/detect-provider
 * Detect mail provider from DNS records
 */
providerTemplateRoutes.post('/detect-provider', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { mxRecords, spfRecord } = body;

  if (!mxRecords || !Array.isArray(mxRecords)) {
    return c.json(
      {
        error: 'Missing required field: mxRecords (array)',
      },
      400
    );
  }

  try {
    const detection = detectProviderFromDns(mxRecords, spfRecord);

    return c.json({
      detection: {
        provider: detection.provider,
        confidence: detection.confidence,
        evidence: detection.evidence,
      },
      template:
        detection.provider !== 'unknown'
          ? {
              name: PROVIDER_TEMPLATES[detection.provider].name,
              knownSelectors: PROVIDER_TEMPLATES[detection.provider].knownSelectors,
            }
          : null,
    });
  } catch (error) {
    const logger = getWebLogger();
    logger.error('Provider detection error:', error instanceof Error ? error : new Error(String(error)), {
      requestId: c.req.header('X-Request-ID'),
      path: '/api/provider-templates/detect',
      method: 'POST',
      tenantId: c.get('tenantId'),
    });
    return c.json(
      {
        error: 'Failed to detect provider',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /api/mail/providers/:provider/selectors
 * Add a custom selector to a provider template (data-backed update)
 */
providerTemplateRoutes.post('/providers/:provider/selectors', requireAdminAccess, async (c) => {
  const provider = c.req.param('provider') as KnownProvider;
  const body = await c.req.json().catch(() => ({}));
  const { selector } = body;

  if (!selector || typeof selector !== 'string') {
    return c.json(
      {
        error: 'Missing required field: selector (string)',
      },
      400
    );
  }

  try {
    const template = templateStorage.getTemplate(provider);
    if (!template) {
      return c.json({ error: 'Provider template not found' }, 404);
    }

    templateStorage.addCustomSelector(provider, selector);

    return c.json({
      message: `Selector "${selector}" added to ${provider}`,
      provider,
      knownSelectors: templateStorage.getTemplate(provider)?.knownSelectors,
    });
  } catch (error) {
    const logger = getWebLogger();
    logger.error('Add selector error:', error instanceof Error ? error : new Error(String(error)), {
      requestId: c.req.header('X-Request-ID'),
      path: '/api/provider-templates/:provider/selectors',
      method: 'POST',
      tenantId: c.get('tenantId'),
    });
    return c.json(
      {
        error: 'Failed to add selector',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// =============================================================================
// Helper Functions
// =============================================================================

function buildActualConfig(
  recordSets: Array<{
    type: string;
    name: string;
    values: string[];
  }>
): {
  mx?: string[];
  spf?: string;
  dmarc?: string;
  dkimSelectors?: string[];
} {
  const actual: {
    mx?: string[];
    spf?: string;
    dmarc?: string;
    dkimSelectors?: string[];
  } = {};

  for (const rs of recordSets) {
    // MX records
    if (rs.type === 'MX') {
      actual.mx = rs.values;
    }

    // SPF (TXT record containing v=spf1)
    if (rs.type === 'TXT') {
      const spfValue = rs.values.find((v) => v.includes('v=spf1'));
      if (spfValue) {
        actual.spf = spfValue;
      }
    }

    // DMARC (_dmarc.domain)
    if (rs.type === 'TXT' && rs.name.includes('_dmarc')) {
      const dmarcValue = rs.values.find((v) => v.includes('v=DMARC1'));
      if (dmarcValue) {
        actual.dmarc = dmarcValue;
      }
    }

    // DKIM selectors (selector._domainkey.domain)
    if (rs.type === 'TXT' && rs.name.includes('._domainkey.')) {
      const selector = rs.name.split('._domainkey.')[0];
      if (!actual.dkimSelectors) {
        actual.dkimSelectors = [];
      }
      if (!actual.dkimSelectors.includes(selector)) {
        actual.dkimSelectors.push(selector);
      }
    }
  }

  return actual;
}
