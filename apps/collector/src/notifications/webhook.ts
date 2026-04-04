/**
 * Webhook Notification Service
 *
 * Sends alert notifications via webhooks with SSRF protection.
 * 5s timeout, best-effort delivery.
 *
 * All webhook URLs go through the shared SSRF guard (ssrf-guard.ts) for
 * consistent protection against private/internal target blocking.
 */

import { validateUrl } from '../probes/ssrf-guard.js';

export interface WebhookPayload {
  alertId: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  domain: string;
  tenantId: string;
  timestamp: string;
  domain360Link: string;
}

export interface WebhookResult {
  success: boolean;
  statusCode?: number;
  error?: string;
  /** The resolved hostname after SSRF check (for logging, not full URL) */
  resolvedHostname?: string;
}

/**
 * Check if a URL points to a private/internal network.
 *
 * This is a thin wrapper around the shared SSRF guard's validateUrl()
 * for backward compatibility with existing code.
 *
 * @deprecated Use validateUrl() from ssrf-guard.ts directly for more context
 */
export function isPrivateUrl(url: string): boolean {
  const result = validateUrl(url);
  return !result.allowed;
}

/**
 * Send an alert webhook notification
 *
 * Best-effort delivery - errors are logged but don't throw.
 * All URLs are validated against the shared SSRF guard.
 *
 * @param webhookUrl - The URL to POST the notification to
 * @param payload - The webhook payload
 * @param signal - Optional AbortSignal for cancellation
 * @returns WebhookResult with success status
 */
export async function sendAlertWebhook(
  webhookUrl: string,
  payload: WebhookPayload,
  signal?: AbortSignal
): Promise<WebhookResult> {
  // SSRF guard - reject private/internal URLs using shared guard
  const ssrfCheck = validateUrl(webhookUrl);
  if (!ssrfCheck.allowed) {
    return {
      success: false,
      error: 'SSRF_BLOCKED',
      resolvedHostname: ssrfCheck.url?.hostname,
    };
  }

  // 5 second timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  const fetchSignal = signal ?? controller.signal;

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'dns-ops-collector/1.0 webhook-notifier',
      },
      body: JSON.stringify(payload),
      signal: fetchSignal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      return {
        success: true,
        statusCode: response.status,
        resolvedHostname: ssrfCheck.url?.hostname,
      };
    }

    return {
      success: false,
      statusCode: response.status,
      error: `HTTP ${response.status}`,
      resolvedHostname: ssrfCheck.url?.hostname,
    };
  } catch (error) {
    clearTimeout(timeout);

    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: 'TIMEOUT',
        resolvedHostname: ssrfCheck.url?.hostname,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
      resolvedHostname: ssrfCheck.url?.hostname,
    };
  }
}

/**
 * Build a webhook payload from alert data
 */
export function buildWebhookPayload(
  alert: {
    id: string;
    title: string;
    description?: string;
    severity: string;
    domain: string;
    tenantId: string;
  },
  baseUrl?: string
): WebhookPayload {
  const timestamp = new Date().toISOString();
  const domain360Link = baseUrl
    ? `${baseUrl}/domain/${alert.domain}`
    : `https://app.dns-ops.example.com/domain/${alert.domain}`;

  return {
    alertId: alert.id,
    title: alert.title,
    description: alert.description ?? '',
    severity: alert.severity as WebhookPayload['severity'],
    domain: alert.domain,
    tenantId: alert.tenantId,
    timestamp,
    domain360Link,
  };
}

/**
 * Alert with webhook notification service.
 *
 * Provides a unified notification path that:
 * 1. Validates webhook URL via SSRF guard
 * 2. Sends the webhook
 * 3. Updates alert status to 'sent' on success
 *
 * This ensures alert status reflects actual delivery truth.
 */

import { createLogger } from '@dns-ops/logging';
import type { Env } from '../types.js';

const notificationLogger = createLogger({
  service: 'dns-ops-collector',
  version: '1.0.0',
  minLevel: 'info',
});

/**
 * Send alert notification and update status.
 *
 * This is the ONE notification path for all alert webhooks.
 *
 * @param alertId - Alert ID for status tracking
 * @param webhookUrl - Target webhook URL
 * @param alertData - Alert data for payload
 * @param db - Database adapter for status updates
 * @param baseUrl - Optional base URL for Domain360 links
 * @returns Result with success status and hostname (for logging)
 */
export async function sendAlertNotification(
  alertId: string,
  webhookUrl: string,
  alertData: {
    id: string;
    title: string;
    description?: string;
    severity: string;
    domain: string;
    tenantId: string;
  },
  db: Env['Variables']['db'],
  baseUrl?: string
): Promise<{
  success: boolean;
  error?: string;
  webhookHost?: string;
  statusUpdated?: boolean;
}> {
  // Build the payload
  const payload = buildWebhookPayload(alertData, baseUrl);

  // Send the webhook
  const result = await sendAlertWebhook(webhookUrl, payload);

  // Log the attempt (without full URL)
  if (result.success) {
    notificationLogger.info('Alert webhook delivered', {
      alertId,
      webhookHost: result.resolvedHostname,
      statusCode: result.statusCode,
    });
  } else {
    notificationLogger.warn('Alert webhook delivery failed', {
      alertId,
      webhookHost: result.resolvedHostname,
      error: result.error,
    });
  }

  // Update alert status on successful delivery
  if (result.success && db) {
    try {
      const { AlertRepository } = await import('@dns-ops/db');
      const alertRepo = new AlertRepository(db);
      await alertRepo.updateStatus(alertId, alertData.tenantId, 'sent');
      return {
        success: true,
        webhookHost: result.resolvedHostname,
        statusUpdated: true,
      };
    } catch (error) {
      // Status update failure should not fail the webhook notification
      notificationLogger.error('Failed to update alert status to sent', {
        alertId,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: true, // Webhook succeeded, status update failed
        webhookHost: result.resolvedHostname,
        statusUpdated: false,
      };
    }
  }

  return {
    success: result.success,
    error: result.error,
    webhookHost: result.resolvedHostname,
  };
}
