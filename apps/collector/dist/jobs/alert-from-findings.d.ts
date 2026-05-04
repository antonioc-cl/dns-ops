/**
 * Alert Generation from Findings - JOB-002
 *
 * Generates alerts when high-severity findings are detected.
 * Runs after collection completes and findings are generated.
 */
import type { Env } from '../types.js';
/**
 * Configuration for alert generation from findings
 */
export interface AlertFromFindingsConfig {
    /** Minimum severity to generate alerts (default: high) */
    minSeverity?: 'critical' | 'high' | 'medium' | 'low' | 'info';
    /** Maximum alerts to generate per snapshot (default: 5) */
    maxAlertsPerSnapshot?: number;
    /** Skip findings marked as reviewOnly */
    skipReviewOnly?: boolean;
}
/**
 * Generate alerts from findings for a snapshot
 *
 * After DNS collection and finding generation, this function checks
 * for high-severity findings and creates alerts for monitored domains.
 *
 * Only generates alerts for domains that are actively monitored (have a
 * MonitoredDomain record). Non-monitored domains are skipped — the alert
 * system is for ongoing monitoring, not ad-hoc checks.
 *
 * @param db - Database adapter
 * @param snapshotId - The snapshot to check for findings
 * @param tenantId - Tenant ID for alert ownership
 * @param domainId - Domain ID to look up monitored domain record
 * @param config - Configuration options
 * @returns Array of created alerts
 */
export declare function generateAlertsFromFindings(db: Env['Variables']['db'], snapshotId: string, tenantId: string, domainId: string, config?: AlertFromFindingsConfig): Promise<Array<{
    alertId: string;
    findingId: string;
}>>;
/**
 * Generate alerts for critical/high severity findings and send webhook
 *
 * @param db - Database adapter
 * @param snapshotId - The snapshot to check
 * @param tenantId - Tenant ID for alert ownership
 * @param domainId - Domain ID to look up monitored domain
 * @param domainName - Domain name for webhook payload
 * @param webhookUrl - Optional webhook URL to send alerts
 */
export declare function generateAndSendFindingAlerts(db: Env['Variables']['db'], snapshotId: string, tenantId: string, domainId: string, domainName: string, webhookUrl?: string): Promise<{
    alerts: Array<{
        alertId: string;
        findingId: string;
    }>;
    webhookSent: boolean;
}>;
//# sourceMappingURL=alert-from-findings.d.ts.map