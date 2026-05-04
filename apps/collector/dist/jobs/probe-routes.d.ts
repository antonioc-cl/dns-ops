/**
 * Probe Routes - Bead 10
 *
 * API endpoints for triggering non-DNS probes.
 * All probes require allowlist validation and SSRF protection.
 *
 * ## Usage Model (dns-ops-1j4.13.5)
 *
 * Probes are designed for **programmatic use only**:
 * - Called by mail collection during snapshot creation
 * - Called by monitoring jobs for MTA-STS/TLS health
 * - NOT exposed in the web UI
 *
 * Rationale for no operator UI:
 * - Probes make external connections (SSRF risk if exposed)
 * - Allowlist enforcement is complex to explain in UI
 * - Results are integrated into findings/evidence automatically
 * - Direct API use is better suited for automation
 *
 * If an operator UI is needed in the future:
 * - Create a "probe preview" mode that shows what would be probed
 * - Show probe results from existing snapshots (no live probing)
 * - Consider a separate "advanced diagnostics" permission
 */
import { Hono } from 'hono';
import type { Env } from '../types.js';
export declare const probeRoutes: Hono<Env, {}, "/">;
//# sourceMappingURL=probe-routes.d.ts.map