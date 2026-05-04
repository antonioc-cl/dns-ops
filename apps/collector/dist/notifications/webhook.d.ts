/**
 * Webhook Notification Service
 *
 * Sends alert notifications via webhooks with SSRF protection.
 * 5s timeout, best-effort delivery.
 *
 * All webhook URLs go through the shared SSRF guard (ssrf-guard.ts) for
 * consistent protection against private/internal target blocking.
 */
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
export declare function isPrivateUrl(url: string): boolean;
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
export declare function sendAlertWebhook(webhookUrl: string, payload: WebhookPayload, signal?: AbortSignal): Promise<WebhookResult>;
/**
 * Build a webhook payload from alert data
 */
export declare function buildWebhookPayload(alert: {
    id: string;
    title: string;
    description?: string;
    severity: string;
    domain: string;
    tenantId: string;
}, baseUrl?: string): WebhookPayload;
import type { Env } from '../types.js';
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
export declare function sendAlertNotification(alertId: string, webhookUrl: string, alertData: {
    id: string;
    title: string;
    description?: string;
    severity: string;
    domain: string;
    tenantId: string;
}, db: Env['Variables']['db'], baseUrl?: string): Promise<{
    success: boolean;
    error?: string;
    webhookHost?: string;
    statusUpdated?: boolean;
}>;
//# sourceMappingURL=webhook.d.ts.map