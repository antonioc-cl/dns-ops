/**
 * Legacy Tools API Routes
 *
 * Provides safe deep-linking to legacy DMARC/DKIM tools.
 *
 * IMPORTANT: These deep-links are provided for backward compatibility only.
 * No parity claims are made between legacy tool outputs and new workbench findings.
 * Users should treat legacy tool results as informational, not authoritative.
 */

import { LegacyAccessLogRepository, ShadowComparisonRepository } from '@dns-ops/db';
import { findings as findingsTable, snapshots as snapshotsTable } from '@dns-ops/db/schema';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { requireAuth } from '../middleware/authorization.js';
import type { Env } from '../types.js';

// Domain validation regex (basic ASCII domain format)
const DOMAIN_RE =
  /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// DKIM selector validation (alphanumeric, hyphens, underscores)
const SELECTOR_RE = /^[a-zA-Z0-9_-]{1,63}$/;

/**
 * Validate and sanitize domain input
 */
function isValidDomain(domain: string): boolean {
  if (!domain || domain.length > 253) return false;
  return DOMAIN_RE.test(domain);
}

/**
 * Validate DKIM selector
 */
function isValidSelector(selector: string): boolean {
  if (!selector || selector.length > 63) return false;
  return SELECTOR_RE.test(selector);
}

/**
 * Build a deep-link URL safely
 */
function buildDeepLink(baseUrl: string, params: Record<string, string>): string | null {
  try {
    const url = new URL(baseUrl);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  } catch {
    return null;
  }
}

export const legacyToolsRoutes = new Hono<Env>();

/**
 * POST /api/legacy-tools/log
 * Log access to legacy tools for shadow comparison analysis
 */
legacyToolsRoutes.post('/log', requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const { tool, domain, action, timestamp, metadata } = body;

    // Validate required fields
    if (!tool || !domain || !action) {
      return c.json({ error: 'Missing required fields: tool, domain, action' }, 400);
    }

    // Validate tool type
    if (!['dmarc', 'dkim'].includes(tool)) {
      return c.json({ error: 'Invalid tool type. Must be "dmarc" or "dkim"' }, 400);
    }

    // Validate action type
    if (!['view', 'navigate'].includes(action)) {
      return c.json({ error: 'Invalid action type. Must be "view" or "navigate"' }, 400);
    }

    // In a production system, this would store to a shadow_comparison_access_log table
    // For now, we log to console and return success
    console.log('[Legacy Tool Access]', {
      tool,
      domain,
      action,
      timestamp: timestamp || new Date().toISOString(),
      metadata,
      userAgent: c.req.header('user-agent'),
    });

    // TODO: Store in database for shadow comparison analysis (Bead 09)
    // This log data will be used to compare legacy tool usage vs new workbench findings

    return c.json({
      success: true,
      logged: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error logging legacy tool access:', error);
    // Return 200 even on error to not break the user experience
    return c.json(
      {
        success: false,
        error: 'Failed to log access',
      },
      200
    );
  }
});

/**
 * GET /api/legacy-tools/config
 * Get legacy tools configuration
 */
legacyToolsRoutes.get('/config', (c) => {
  const dmarcUrl = process.env.VITE_DMARC_TOOL_URL;
  const dkimUrl = process.env.VITE_DKIM_TOOL_URL;

  // Return sanitized configuration (no sensitive URLs in production)
  const config = {
    dmarc: {
      name: 'DMARC Analyzer',
      available: !!dmarcUrl,
      supportDeepLink: !!dmarcUrl,
      supportEmbed: false,
      authRequired: true,
      disclaimer:
        'Legacy tool output is informational only. No parity with workbench findings is guaranteed.',
    },
    dkim: {
      name: 'DKIM Validator',
      available: !!dkimUrl,
      supportDeepLink: !!dkimUrl,
      supportEmbed: false,
      authRequired: true,
      disclaimer:
        'Legacy tool output is informational only. No parity with workbench findings is guaranteed.',
    },
  };

  return c.json(config);
});

/**
 * GET /api/legacy-tools/dmarc/deeplink
 * Generate a deep-link to the legacy DMARC analyzer for a domain
 *
 * Query params:
 *   - domain: The domain to analyze (required)
 *
 * Returns:
 *   - url: The deep-link URL
 *   - disclaimer: Warning that this is a legacy tool
 */
legacyToolsRoutes.get('/dmarc/deeplink', requireAuth, (c) => {
  const domain = c.req.query('domain');
  const dmarcUrl = process.env.VITE_DMARC_TOOL_URL;

  if (!dmarcUrl) {
    return c.json(
      {
        error: 'DMARC tool not configured',
        message: 'Legacy DMARC analyzer is not available in this environment.',
      },
      503
    );
  }

  if (!domain) {
    return c.json({ error: 'Domain is required' }, 400);
  }

  if (!isValidDomain(domain)) {
    return c.json({ error: 'Invalid domain format' }, 400);
  }

  const deepLink = buildDeepLink(dmarcUrl, { domain });
  if (!deepLink) {
    return c.json({ error: 'Failed to build deep-link URL' }, 500);
  }

  return c.json({
    tool: 'dmarc',
    domain,
    url: deepLink,
    disclaimer:
      'This links to a legacy tool. Results may differ from workbench findings. No parity is guaranteed.',
    legacyWarning: true,
    openInNewTab: true,
  });
});

/**
 * GET /api/legacy-tools/dkim/deeplink
 * Generate a deep-link to the legacy DKIM validator for a domain and selector
 *
 * Query params:
 *   - domain: The domain to analyze (required)
 *   - selector: The DKIM selector (required)
 *
 * Returns:
 *   - url: The deep-link URL
 *   - disclaimer: Warning that this is a legacy tool
 */
legacyToolsRoutes.get('/dkim/deeplink', requireAuth, (c) => {
  const domain = c.req.query('domain');
  const selector = c.req.query('selector');
  const dkimUrl = process.env.VITE_DKIM_TOOL_URL;

  if (!dkimUrl) {
    return c.json(
      {
        error: 'DKIM tool not configured',
        message: 'Legacy DKIM validator is not available in this environment.',
      },
      503
    );
  }

  if (!domain) {
    return c.json({ error: 'Domain is required' }, 400);
  }

  if (!selector) {
    return c.json({ error: 'Selector is required' }, 400);
  }

  if (!isValidDomain(domain)) {
    return c.json({ error: 'Invalid domain format' }, 400);
  }

  if (!isValidSelector(selector)) {
    return c.json({ error: 'Invalid selector format' }, 400);
  }

  const deepLink = buildDeepLink(dkimUrl, { domain, selector });
  if (!deepLink) {
    return c.json({ error: 'Failed to build deep-link URL' }, 500);
  }

  return c.json({
    tool: 'dkim',
    domain,
    selector,
    url: deepLink,
    disclaimer:
      'This links to a legacy tool. Results may differ from workbench findings. No parity is guaranteed.',
    legacyWarning: true,
    openInNewTab: true,
  });
});

/**
 * POST /api/legacy-tools/bulk-deeplinks
 * Generate multiple deep-links in a single request
 *
 * Body:
 *   - requests: Array of { tool: 'dmarc'|'dkim', domain: string, selector?: string }
 *
 * Returns array of deep-link results
 */
legacyToolsRoutes.post('/bulk-deeplinks', requireAuth, async (c) => {
  const dmarcUrl = process.env.VITE_DMARC_TOOL_URL;
  const dkimUrl = process.env.VITE_DKIM_TOOL_URL;

  let body: { requests?: Array<{ tool: string; domain: string; selector?: string }> };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const { requests } = body;
  if (!requests || !Array.isArray(requests)) {
    return c.json({ error: 'requests array is required' }, 400);
  }

  if (requests.length > 50) {
    return c.json({ error: 'Maximum 50 requests per batch' }, 400);
  }

  const results = requests.map((req, index) => {
    const { tool, domain, selector } = req;

    if (!tool || !['dmarc', 'dkim'].includes(tool)) {
      return { index, error: 'Invalid tool type' };
    }

    if (!domain || !isValidDomain(domain)) {
      return { index, error: 'Invalid domain' };
    }

    if (tool === 'dmarc') {
      if (!dmarcUrl) {
        return { index, error: 'DMARC tool not configured' };
      }
      const url = buildDeepLink(dmarcUrl, { domain });
      return url ? { index, tool, domain, url } : { index, error: 'Failed to build URL' };
    }

    if (tool === 'dkim') {
      if (!dkimUrl) {
        return { index, error: 'DKIM tool not configured' };
      }
      if (!selector || !isValidSelector(selector)) {
        return { index, error: 'Invalid selector' };
      }
      const url = buildDeepLink(dkimUrl, { domain, selector });
      return url ? { index, tool, domain, selector, url } : { index, error: 'Failed to build URL' };
    }

    return { index, error: 'Unknown error' };
  });

  return c.json({
    results,
    disclaimer:
      'These links point to legacy tools. Results may differ from workbench findings. No parity is guaranteed.',
    legacyWarning: true,
  });
});

/**
 * GET /api/legacy-tools/shadow-stats
 * Get shadow comparison statistics backed by stored access and comparison results
 */
legacyToolsRoutes.get('/shadow-stats', requireAuth, async (c) => {
  const db = c.get('db');
  const domain = c.req.query('domain');

  try {
    const legacyLogRepo = new LegacyAccessLogRepository(db);
    const shadowRepo = new ShadowComparisonRepository(db);

    // Get legacy access statistics
    const legacyStats = await legacyLogRepo.getStats();

    // Get shadow comparison statistics
    const shadowStats = await shadowRepo.getStats();

    // If domain is specified, get domain-specific stats
    let domainStats = null;
    let newFindingsCount = 0;
    const discrepancies: Array<{
      id: string;
      field: string;
      legacyValue: unknown;
      newValue: unknown;
      comparedAt: Date;
    }> = [];

    if (domain) {
      // Get legacy access logs for this domain
      const domainLogs = await legacyLogRepo.findByDomain(domain);

      // Get shadow comparisons for this domain
      const domainComparisons = await shadowRepo.findByDomain(domain);

      // Get latest snapshot for this domain to count findings
      const domainSnapshots = await db.selectWhere(
        snapshotsTable,
        eq(snapshotsTable.domainName, domain)
      );
      // Sort by createdAt desc and get the latest
      domainSnapshots.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      if (domainSnapshots.length > 0) {
        const findings = await db.selectWhere(
          findingsTable,
          eq(findingsTable.snapshotId, domainSnapshots[0].id)
        );
        newFindingsCount = findings.length;
      }

      // Extract discrepancies from mismatched comparisons
      const mismatches = domainComparisons.filter(
        (c) => c.status === 'mismatch' || c.status === 'partial-match'
      );

      for (const mismatch of mismatches.slice(0, 10)) {
        const comparisons = mismatch.comparisons as Array<{
          field: string;
          status: string;
          legacyValue: unknown;
          newValue: unknown;
        }>;

        for (const comp of comparisons) {
          if (comp.status === 'mismatch') {
            discrepancies.push({
              id: mismatch.id,
              field: comp.field,
              legacyValue: comp.legacyValue,
              newValue: comp.newValue,
              comparedAt: mismatch.comparedAt,
            });
          }
        }
      }

      domainStats = {
        legacyAccessCount: domainLogs.length,
        comparisonCount: domainComparisons.length,
        matchCount: domainComparisons.filter((c) => c.status === 'match').length,
        mismatchCount: domainComparisons.filter((c) => c.status === 'mismatch').length,
        partialMatchCount: domainComparisons.filter((c) => c.status === 'partial-match').length,
        pendingAdjudication: domainComparisons.filter(
          (c) => !c.adjudication && c.status !== 'match'
        ).length,
      };
    }

    return c.json({
      domain: domain || 'all',
      legacyAccessCount: domain ? (domainStats?.legacyAccessCount ?? 0) : legacyStats.total,
      newFindingsCount,
      discrepancies,
      stats: {
        legacy: {
          total: legacyStats.total,
          byToolType: legacyStats.byToolType,
          successRate: legacyStats.successRate,
          last24h: legacyStats.last24h,
        },
        shadow: {
          total: shadowStats.total,
          matches: shadowStats.matches,
          mismatches: shadowStats.mismatches,
          partialMatches: shadowStats.partialMatches,
          acknowledged: shadowStats.acknowledged,
          pending: shadowStats.pending,
        },
        domain: domainStats,
      },
      durable: true, // Indicates data is persisted to database
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
