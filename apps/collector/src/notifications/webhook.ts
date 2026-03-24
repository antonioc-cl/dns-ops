/**
 * Webhook Notification Service
 *
 * Sends alert notifications via webhooks with SSRF protection.
 * 5s timeout, best-effort delivery.
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
}

// RFC 1918 and private address ranges to block
const PRIVATE_IP_PATTERNS = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^127\./,
  /^localhost$/i,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
  /^0\.0\.0\.0$/,
];

/**
 * Check if a URL points to a private/internal network
 */
export function isPrivateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // Check against blocklist patterns
    for (const pattern of PRIVATE_IP_PATTERNS) {
      if (pattern.test(hostname)) {
        return true;
      }
    }

    // Check for IPv4-mapped IPv6 addresses (::ffff:x.x.x.x)
    const ipv4Match = hostname.match(/::ffff:(\d+\.\d+\.\d+\.\d+)/);
    if (ipv4Match) {
      const ipv4 = ipv4Match[1];
      return PRIVATE_IP_PATTERNS.slice(0, 4).some((pattern) => pattern.test(ipv4));
    }

    return false;
  } catch {
    // Invalid URL
    return true;
  }
}

/**
 * Send an alert webhook notification
 *
 * Best-effort delivery - errors are logged but don't throw.
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
  // SSRF guard - reject private/internal URLs
  if (isPrivateUrl(webhookUrl)) {
    return {
      success: false,
      error: 'SSRF_BLOCKED',
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
      };
    }

    return {
      success: false,
      statusCode: response.status,
      error: `HTTP ${response.status}`,
    };
  } catch (error) {
    clearTimeout(timeout);

    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: 'TIMEOUT',
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
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
