/**
 * Domain Collection Job
 *
 * API routes for triggering DNS collection jobs.
 * Uses shared contracts from @dns-ops/contracts for request/response types.
 */

import {
  type ApiErrorResponse,
  type CollectDomainRequest,
  type CollectDomainResponse,
  validateCollectDomainRequest,
} from '@dns-ops/contracts';
import { createPostgresAdapter, SnapshotRepository } from '@dns-ops/db';
import { isValidDomain, normalizeDomain } from '@dns-ops/parsing';
import { Hono } from 'hono';
import { DNSCollector } from '../dns/collector.js';
import type { CollectionConfig } from '../dns/types.js';
import { getCollectorLogger, trackCollectionError, trackCollectionResult } from '../middleware/error-tracking.js';
import type { Env } from '../types.js';

const logger = getCollectorLogger();

export const collectDomainRoutes = new Hono<Env>();

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

    trackCollectionResult({
      domain: normalizedDomain,
      snapshotId: result.snapshotId,
      recordCount: result.observationCount,
      durationMs: result.duration,
      resultState: result.resultState,
    });

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
    const error = err instanceof Error ? err : new Error(String(err));
    trackCollectionError(error, { domain: 'unknown' });
    const errResponse: ApiErrorResponse = {
      error: 'Collection failed',
      message: error.message,
      code: 'COLLECTION_ERROR',
    };
    return c.json(errResponse, 500);
  }
});

/**
 * GET /api/collect/status/:snapshotId
 * Check collection status by looking up the snapshot in the database
 */
collectDomainRoutes.get('/status/:snapshotId', async (c) => {
  const db = c.get('db');
  const snapshotId = c.req.param('snapshotId');

  try {
    const snapshotRepo = new SnapshotRepository(db);
    const snapshot = await snapshotRepo.findById(snapshotId);

    if (!snapshot) {
      return c.json(
        {
          error: 'Snapshot not found',
          snapshotId,
        },
        404
      );
    }

    // Map resultState to status response
    const status = snapshot.resultState; // 'complete', 'partial', or 'failed'

    return c.json({
      snapshotId,
      status,
      domain: snapshot.domainId, // Note: this is domainId, not domain name
      createdAt: snapshot.createdAt,
      completedAt: snapshot.createdAt, // Collection is synchronous, so same as created
      errorMessage: snapshot.errorMessage,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Status check error', err, { snapshotId });
    return c.json(
      {
        error: 'Failed to check status',
        message: err.message,
        snapshotId,
      },
      500
    );
  }
});

// Domain validation is now handled by @dns-ops/parsing.isValidDomain
// which ensures consistent validation between web and collector
