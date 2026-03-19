/**
 * DKIM Selectors API Routes
 *
 * Endpoints for retrieving discovered DKIM selectors with provenance.
 */

import { ObservationRepository, SnapshotRepository } from '@dns-ops/db';
import { Hono } from 'hono';
import type { Env } from '../types.js';

export const selectorRoutes = new Hono<Env>();

/**
 * GET /api/snapshot/:snapshotId/selectors
 * Get discovered DKIM selectors with provenance
 */
selectorRoutes.get('/snapshot/:snapshotId/selectors', async (c) => {
  const snapshotId = c.req.param('snapshotId');
  const db = c.get('db');

  try {
    const snapshotRepo = new SnapshotRepository(db);
    const observationRepo = new ObservationRepository(db);

    // Fetch snapshot
    const snapshot = await snapshotRepo.findById(snapshotId);
    if (!snapshot) {
      return c.json({ error: 'Snapshot not found' }, 404);
    }

    // Fetch DKIM-related observations
    const observations = await observationRepo.findBySnapshotId(snapshotId);

    // Filter for DKIM observations (selector._domainkey.domain)
    const dkimObservations = observations.filter(
      (obs) => obs.queryType === 'TXT' && obs.queryName.includes('_domainkey')
    );

    // Parse selectors from query names
    const selectors = dkimObservations.map((obs) => {
      const selectorMatch = obs.queryName.match(/^([^.]+)\._domainkey\./);
      const selector = selectorMatch ? selectorMatch[1] : 'unknown';

      // Determine provenance from observation metadata if available
      // For now, we infer from the query pattern
      let provenance: string = 'common-dictionary';
      let confidence: string = 'low';

      // Check for provider-specific patterns
      if (selector.includes('google')) {
        provenance = 'provider-heuristic';
        confidence = 'medium';
      } else if (selector.startsWith('selector')) {
        provenance = 'provider-heuristic';
        confidence = 'medium';
      }

      return {
        selector,
        found: obs.status === 'success' && obs.answerSection && obs.answerSection.length > 0,
        provenance,
        confidence,
        queryName: obs.queryName,
        status: obs.status,
      };
    });

    // If no DKIM observations found, the collector didn't discover any
    if (selectors.length === 0) {
      return c.json({
        snapshotId,
        selectors: [],
        message: 'No DKIM selectors discovered for this snapshot',
        discoveryMethod: 'none',
      });
    }

    return c.json({
      snapshotId,
      selectors,
      count: selectors.length,
      found: selectors.filter((s) => s.found).length,
    });
  } catch (error) {
    console.error('Error fetching selectors:', error);
    return c.json(
      {
        error: 'Failed to fetch selectors',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /api/domain/:domain/selectors/suggest
 * Suggest DKIM selectors based on provider detection
 */
selectorRoutes.get('/domain/:domain/selectors/suggest', async (c) => {
  const domain = c.req.param('domain');

  try {
    // Fetch existing observations to detect provider
    const obsResponse = await fetch(`/api/domain/${domain}/latest`);
    if (!obsResponse.ok) {
      return c.json({ error: 'No data for domain' }, 404);
    }

    const snapshot = (await obsResponse.json()) as { id: string };

    // Get observations
    const observations = (await fetch(`/api/snapshot/${snapshot.id}/observations`).then((r) =>
      r.json()
    )) as Array<{
      queryType: string;
      answerSection?: Array<{ data: string }>;
    }>;

    // Simple provider detection from MX
    const mxObs = observations.find((o) => o.queryType === 'MX');
    let provider: string | null = null;
    let suggestedSelectors: string[] = [];

    const mxData = mxObs?.answerSection?.[0]?.data?.toLowerCase();
    if (mxData) {
      if (mxData.includes('google')) {
        provider = 'google-workspace';
        suggestedSelectors = ['google', '20210112'];
      } else if (mxData.includes('outlook') || mxData.includes('microsoft')) {
        provider = 'microsoft-365';
        suggestedSelectors = ['selector1', 'selector2'];
      }
    }

    return c.json({
      domain,
      provider,
      suggestedSelectors,
      message: provider
        ? `Detected ${provider} - suggested selectors based on provider templates`
        : 'No provider detected - try common selectors',
    });
  } catch (error) {
    return c.json(
      {
        error: 'Failed to suggest selectors',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});
