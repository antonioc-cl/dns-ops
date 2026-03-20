/**
 * Domain Collection Job
 *
 * API routes for triggering DNS collection jobs.
 * Uses shared contracts from @dns-ops/contracts for request/response types.
 */
import { validateCollectDomainRequest, } from '@dns-ops/contracts';
import { createPostgresAdapter } from '@dns-ops/db';
import { normalizeDomain } from '@dns-ops/parsing';
import { Hono } from 'hono';
import { DNSCollector } from '../dns/collector.js';
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
            const error = {
                error: 'Invalid request',
                message: 'Domain is required and must be a non-empty string',
                code: 'INVALID_REQUEST',
            };
            return c.json(error, 400);
        }
        const req = body;
        // Use shared domain normalization (same as web app)
        const domainInfo = normalizeDomain(req.domain);
        // Validate domain format using shared validation
        if (!isValidDomain(domainInfo.normalized)) {
            const error = {
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
        const config = {
            domain: normalizedDomain,
            zoneManagement: zoneManagement,
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
        const response = {
            success: true,
            domain: normalizedDomain,
            snapshotId: result.snapshotId,
            observationCount: result.observationCount,
            resultState: result.resultState,
            duration: result.duration,
        };
        return c.json(response, 201);
    }
    catch (err) {
        console.error('Collection error:', err);
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
function isValidDomain(domain) {
    // Simple domain validation
    if (!domain || domain.length > 253)
        return false;
    // Check for valid characters - labels cannot start or end with hyphen
    const labelRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i;
    const labels = domain.split('.');
    // Reject empty labels and labels that are just hyphens or start/end with hyphen
    for (const label of labels) {
        if (!label || label.length > 63)
            return false;
        if (!labelRegex.test(label))
            return false;
        // Explicit check: no leading or trailing hyphen
        if (label.startsWith('-') || label.endsWith('-'))
            return false;
    }
    return true;
}
//# sourceMappingURL=collect-domain.js.map