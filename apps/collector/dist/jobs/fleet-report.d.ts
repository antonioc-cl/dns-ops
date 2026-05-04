/**
 * Fleet Report Routes - Bead 11 / Bead 18
 *
 * Batch checking and reporting for domain inventories.
 * Produces internal reports backed by persisted findings.
 *
 * ## Bead 18 Update
 * Replaced low-truth parallel fleet logic with reports/export backed
 * by stored findings. Now uses FindingRepository to query persisted
 * findings rather than re-analyzing observations.
 */
import type { Finding } from '@dns-ops/db';
import { Hono } from 'hono';
import type { Env } from '../types.js';
export declare const fleetReportRoutes: Hono<Env, {}, "/">;
interface FleetReportResult {
    domain: string;
    snapshotId: string;
    collectedAt: Date;
    rulesetVersion: string | null;
    findingsCount: number;
    checks: CheckResult[];
    issues: CheckResult[];
}
interface CheckResult {
    check: string;
    status: 'pass' | 'fail' | 'warning' | 'missing';
    severity: 'ok' | 'low' | 'medium' | 'high' | 'critical';
    message: string;
    details?: Record<string, unknown>;
}
/**
 * Map persisted findings to fleet report check results
 *
 * This uses the rules engine's persisted findings instead of
 * re-analyzing observations, ensuring consistency with the
 * main findings API.
 */
export declare function findingsToCheckResults(findings: Finding[], checkTypes: string[]): CheckResult[];
/**
 * Map finding severity to check status
 */
export declare function mapSeverityToStatus(severity: string): CheckResult['status'];
export declare function generateSummary(results: FleetReportResult[], checkTypes: string[]): Record<string, unknown>;
export {};
//# sourceMappingURL=fleet-report.d.ts.map