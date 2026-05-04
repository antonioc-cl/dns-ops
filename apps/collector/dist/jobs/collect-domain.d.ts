/**
 * Domain Collection Job
 *
 * API routes for triggering DNS collection jobs.
 * Uses shared contracts from @dns-ops/contracts for request/response types.
 *
 * ARCHITECTURE DECISION: Synchronous Single-Domain Collection (PR-07.2)
 * ========================================================================
 * Single-domain collection via POST /api/collect/domain runs synchronously
 * by design. This is intentional and provides several benefits:
 *
 * 1. IMMEDIATE FEEDBACK: Users get instant results for ad-hoc domain checks
 *    without polling or websockets. The HTTP response includes snapshot ID,
 *    observation count, and collection status.
 *
 * 2. NO REDIS DEPENDENCY: Single-domain collection works without Redis,
 *    reducing infrastructure requirements for basic usage. The job queue
 *    (BullMQ) is only required for scheduled monitoring and fleet reports.
 *
 * 3. SIMPLER ERROR HANDLING: Errors are returned directly in the HTTP
 *    response rather than requiring separate status polling.
 *
 * 4. REQUEST-RESPONSE SEMANTICS: DNS collection is fast enough (typically
 *    <5s) that async processing adds unnecessary complexity for single
 *    domains.
 *
 * When to use the job queue instead:
 * - Scheduled monitoring refreshes (use scheduleMonitoringJob)
 * - Fleet report generation (use getReportsQueue)
 * - Bulk domain processing (future: batch collection endpoint)
 *
 * The queue infrastructure exists in ./queue.ts but is intentionally NOT
 * used for single-domain ad-hoc collection.
 */
import { Hono } from 'hono';
import type { Env } from '../types.js';
export declare const collectDomainRoutes: Hono<Env, {}, "/">;
//# sourceMappingURL=collect-domain.d.ts.map