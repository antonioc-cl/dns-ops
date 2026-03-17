/**
 * Domain Collection Job
 *
 * API routes for triggering DNS collection jobs.
 */

import { Hono } from 'hono';
import { DNSCollector } from '../dns/collector';
import type { CollectionConfig } from '../dns/types';

export const collectDomainRoutes = new Hono();

/**
 * POST /api/collect/domain
 * Trigger a DNS collection for a domain
 */
collectDomainRoutes.post('/domain', async (c) => {
  try {
    const body = await c.req.json();
    const { domain, zoneManagement = 'unknown', triggeredBy = 'api' } = body;

    if (!domain || typeof domain !== 'string') {
      return c.json({ error: 'Domain is required' }, 400);
    }

    // Normalize domain
    const normalizedDomain = domain.toLowerCase().trim().replace(/\.$/, '');

    // Validate domain format
    if (!isValidDomain(normalizedDomain)) {
      return c.json({ error: 'Invalid domain format' }, 400);
    }

    // Configuration for collection
    const config: CollectionConfig = {
      domain: normalizedDomain,
      zoneManagement: zoneManagement as 'managed' | 'unmanaged' | 'unknown',
      recordTypes: ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'CAA'],
      triggeredBy,
    };

    // Run collection
    const collector = new DNSCollector(config);
    const result = await collector.collect();

    return c.json({
      success: true,
      domain: normalizedDomain,
      snapshotId: result.snapshotId,
      observationCount: result.observationCount,
      resultState: result.resultState,
      duration: result.duration,
    }, 201);

  } catch (error) {
    console.error('Collection error:', error);
    return c.json({
      error: 'Collection failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

/**
 * GET /api/collect/status/:snapshotId
 * Check collection status
 */
collectDomainRoutes.get('/status/:snapshotId', async (c) => {
  // TODO: Implement status check if using async job queue
  return c.json({
    snapshotId: c.req.param('snapshotId'),
    status: 'completed',
  });
});

function isValidDomain(domain: string): boolean {
  // Simple domain validation
  if (!domain || domain.length > 253) return false;
  
  // Check for valid characters
  const labelRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i;
  const labels = domain.split('.');
  
  return labels.every(label => labelRegex.test(label));
}