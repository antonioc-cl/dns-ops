/**
 * Domain Collection Job
 *
 * API routes for triggering DNS collection jobs.
 * Uses shared contracts from @dns-ops/contracts for request/response types.
 */

import {
  type CollectDomainRequest,
  type CollectDomainResponse,
  type ApiErrorResponse,
  validateCollectDomainRequest,
} from '@dns-ops/contracts';
import { createPostgresAdapter } from '@dns-ops/db';
import { normalizeDomain, isValidDomain } from '@dns-ops/parsing';
import { Hono } from 'hono';
import { DNSCollector } from '../dns/collector.js';
import type { CollectionConfig } from '../dns/types.js';

export const collectDomainRoutes = new Hono();

/**
 * POST /api/collect/domain
 * Trigger a DNS collection for a domain
 *
 * Request: CollectDomainRequest
 * Response: CollectDomainResponse | ApiErrorResponse
 */
collectDomainRoutes.post('/domain', async (c) => {
  try {
    const body = await c.req.json();

    // Validate request shape
    if (!validateCollectDomainRequest(body)) {
      const error: ApiErrorResponse = {
        error: 'Invalid request',
        message: 'Domain is required and must be a non-empty string',
        code: 'INVALID_REQUEST',
      };
      return c.json(error, 400);
    }

    const req = body as CollectDomainRequest;

    // Use shared domain normalization (same as web app)
    const domainInfo = normalizeDomain(req.domain);

    // Validate domain format using shared validation
    if (!isValidDomain(domainInfo.normalized)) {
      const error: ApiErrorResponse = {
        error: 'Invalid domain format',
        message: `"${req.domain}" is not a valid domain name`,
        code: 'INVALID_DOMAIN',
      };
      return c.json(error, 400);
    }

    const normalizedDomain = domainInfo.normalized;
    const zoneManagement = req.zoneManagement ?? 'unknown';
    const triggeredBy = req.triggeredBy ?? 'api';

    // Extract mail collection options (Bead 08)
    const { dkimSelectors, managedDkimSelectors, includeMailRecords } = req;

    // Configuration for collection
    const config: CollectionConfig = {
      domain: normalizedDomain,
      zoneManagement: zoneManagement as 'managed' | 'unmanaged' | 'unknown',
      recordTypes: ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'CAA'],
      triggeredBy,
      includeMailRecords: includeMailRecords !== false, // Default to true
      dkimSelectors: Array.isArray(dkimSelectors) ? dkimSelectors : undefined,
      managedDkimSelectors: Array.isArray(managedDkimSelectors) ? managedDkimSelectors : undefined,
    };

    // Create database connection
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return c.json({ error: 'DATABASE_URL not configured' }, 500);
    }
    const db = createPostgresAdapter(dbUrl);

    // Run collection
    const collector = new DNSCollector(config, db);
    const result = await collector.collect();

    const response: CollectDomainResponse = {
      success: true,
      domain: normalizedDomain,
      snapshotId: result.snapshotId,
      observationCount: result.observationCount,
      resultState: result.resultState,
      duration: result.duration,
    };
    return c.json(response, 201);
  } catch (err) {
    console.error('Collection error:', err);
    const errResponse: ApiErrorResponse = {
      error: 'Collection failed',
      message: err instanceof Error ? err.message : 'Unknown error',
      code: 'COLLECTION_ERROR',
    };
    return c.json(errResponse, 500);
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

// Domain validation is now handled by @dns-ops/parsing.isValidDomain
// which ensures consistent validation between web and collector
