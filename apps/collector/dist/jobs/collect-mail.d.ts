/**
 * Mail Collection Job
 *
 * Collects mail-related DNS records for a domain:
 * - MX (with null MX detection)
 * - DMARC, DKIM, SPF
 * - MTA-STS, TLS-RPT
 *
 * ## Behavior with and without snapshotId
 *
 * **With snapshotId (persisted mode):**
 * - Results are stored in the database as observations
 * - DKIM selectors are tracked with provenance
 * - Mail evidence summary is created for findings engine
 * - Historical tracking enabled
 *
 * **Without snapshotId (ephemeral mode):**
 * - Results are returned in the response only
 * - No database writes occur
 * - Useful for ad-hoc diagnostics and previews
 * - Can be promoted to persisted by later collecting with a snapshotId
 *
 * This design allows:
 * 1. Quick checks without creating state (debugging, exploration)
 * 2. Full collection as part of a snapshot workflow
 */
import { Hono } from 'hono';
import type { Env } from '../types.js';
export declare const collectMailRoutes: Hono<Env, {}, "/">;
//# sourceMappingURL=collect-mail.d.ts.map