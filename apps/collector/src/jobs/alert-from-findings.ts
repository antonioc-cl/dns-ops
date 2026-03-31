/**
 * Alert Generation from Findings - JOB-002
 *
 * Generates alerts when high-severity findings are detected.
 * Runs after collection completes and findings are generated.
 */

import { AlertRepository, FindingRepository } from '@dns-ops/db';
import { createLogger } from '@dns-ops/logging';
import { buildWebhookPayload, sendAlertWebhook } from '../notifications/webhook.js';
import type { Env } from '../types.js';

const logger = createLogger({
  service: 'dns-ops-collector',
  version: '1.0.0',
  minLevel: 'info',
});

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
 * @param db - Database adapter
 * @param snapshotId - The snapshot to check for findings
 * @param tenantId - Tenant ID for alert ownership
 * @param config - Configuration options
 * @returns Array of created alerts
 */
export async function generateAlertsFromFindings(
  db: Env['Variables']['db'],
  snapshotId: string,
  tenantId: string,
  config: AlertFromFindingsConfig = {}
): Promise<Array<{ alertId: string; findingId: string }>> {
  const {
    minSeverity = 'high',
    maxAlertsPerSnapshot = 5,
    skipReviewOnly = true,
  } = config;

  if (!db) {
    logger.warn('Database not available, skipping alert generation');
    return [];
  }

  const alertRepo = new AlertRepository(db);
  const findingRepo = new FindingRepository(db);

  // Get severity priority (lower number = higher priority)
  const severityPriority: Record<string, number> = {
    critical: 1,
    high: 2,
    medium: 3,
    low: 4,
    info: 5,
  };

  const minPriority = severityPriority[minSeverity];

  // Get all findings for this snapshot
  const findings = await findingRepo.findBySnapshotId(snapshotId);

  if (findings.length === 0) {
    logger.debug(`No findings for snapshot ${snapshotId}`);
    return [];
  }

  // Filter findings by severity and reviewOnly
  const alertableFindings = findings
    .filter((f) => {
      if (skipReviewOnly && f.reviewOnly) return false;
      return severityPriority[f.severity] <= minPriority;
    })
    .sort((a, b) => severityPriority[a.severity] - severityPriority[b.severity])
    .slice(0, maxAlertsPerSnapshot);

  if (alertableFindings.length === 0) {
    logger.debug(`No alertable findings for snapshot ${snapshotId}`);
    return [];
  }

  const results: Array<{ alertId: string; findingId: string }> = [];

  for (const finding of alertableFindings) {
    try {
      const alert = await alertRepo.create({
        monitoredDomainId: '', // Would need proper linkage to monitored domain
        title: `[${finding.severity.toUpperCase()}] ${finding.title}`,
        description: finding.description,
        severity: finding.severity,
        triggeredByFindingId: finding.id,
        tenantId,
      });

      results.push({ alertId: alert.id, findingId: finding.id });

      logger.info(`Generated alert from finding`, {
        alertId: alert.id,
        findingId: finding.id,
        severity: finding.severity,
      });
    } catch (error) {
      logger.error(`Failed to create alert from finding ${finding.id}`, { error });
    }
  }

  return results;
}

/**
 * Generate alerts for critical/high severity findings and send webhook
 *
 * @param db - Database adapter
 * @param snapshotId - The snapshot to check
 * @param tenantId - Tenant ID for alert ownership
 * @param webhookUrl - Optional webhook URL to send alerts
 */
export async function generateAndSendFindingAlerts(
  db: Env['Variables']['db'],
  snapshotId: string,
  tenantId: string,
  webhookUrl?: string
): Promise<{ alerts: Array<{ alertId: string; findingId: string }>; webhookSent: boolean }> {
  const alerts = await generateAlertsFromFindings(db, snapshotId, tenantId, {
    minSeverity: 'high',
    maxAlertsPerSnapshot: 3,
  });

  let webhookSent = false;

  if (webhookUrl && alerts.length > 0) {
    try {
      // Send individual webhook for each alert
      for (const { alertId, findingId } of alerts) {
        const payload = buildWebhookPayload({
          id: alertId,
          title: 'High Severity Finding Alert',
          description: `Finding ${findingId} requires attention`,
          severity: 'high',
          domain: snapshotId,
          tenantId,
        });

        await sendAlertWebhook(webhookUrl, payload);
      }

      webhookSent = true;
    } catch (error) {
      logger.error('Failed to send finding alerts webhook', { error });
    }
  }

  return { alerts, webhookSent };
}
