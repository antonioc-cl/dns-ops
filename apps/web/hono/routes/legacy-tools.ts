/**
 * Legacy Tools API Routes
 *
 * Logging and configuration for legacy DMARC/DKIM tool integration.
 */

import { Hono } from 'hono';
import type { Env } from '../types.js';

export const legacyToolsRoutes = new Hono<Env>();

/**
 * POST /api/legacy-tools/log
 * Log access to legacy tools for shadow comparison analysis
 */
legacyToolsRoutes.post('/log', async (c) => {
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
  // Return sanitized configuration (no sensitive URLs in production)
  const config = {
    dmarc: {
      name: 'DMARC Analyzer',
      supportDeepLink: true,
      supportEmbed: false,
      authRequired: true,
    },
    dkim: {
      name: 'DKIM Validator',
      supportDeepLink: true,
      supportEmbed: false,
      authRequired: true,
    },
  };

  return c.json(config);
});

/**
 * GET /api/legacy-tools/shadow-stats
 * Get shadow comparison statistics (placeholder for Bead 09)
 */
legacyToolsRoutes.get('/shadow-stats', async (c) => {
  const { domain } = c.req.query();

  // Placeholder for shadow comparison statistics
  // In Bead 09, this will return:
  // - How many times legacy tools were accessed for this domain
  // - Comparison between legacy outputs and new workbench findings
  // - Discrepancy reports

  return c.json({
    domain: domain || 'all',
    message: 'Shadow comparison stats will be available in Bead 09',
    legacyAccessCount: 0,
    newFindingsCount: 0,
    discrepancies: [],
  });
});
