/**
 * Collector Proxy — web → collector communication with circuit breaker
 *
 * Provides authenticated proxying to the collector service with:
 * - Auth header injection (internal secret or dev bypass)
 * - Circuit breaker to fail fast when collector is unreachable
 * - Consistent error responses across all proxy consumers
 */

import type { Context } from 'hono';
import { getEnvConfig } from '../config/env.js';
import type { Env } from '../types.js';

// =============================================================================
// Types
// =============================================================================

export interface CollectorProxyConfig {
  collectorUrl: string;
  headers: Record<string, string>;
}

export interface ProxyRequest {
  /** Path on the collector (e.g., '/api/collect/domain') */
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
}

export interface ProxyResult {
  ok: boolean;
  status: number;
  json: unknown;
}

// =============================================================================
// Circuit Breaker
// =============================================================================

export type CircuitState = 'closed' | 'open' | 'half-open';

const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 30_000; // 30 seconds

/**
 * Lightweight circuit breaker for the collector proxy.
 *
 * - CLOSED: requests flow normally; consecutive failures are counted.
 * - OPEN: requests are rejected immediately with 503.
 * - HALF-OPEN: one probe request is allowed; success resets, failure re-opens.
 *
 * State is process-local (sufficient for Workers where each isolate is short-lived,
 * and for Node.js where a single process handles the web app).
 */
class CollectorCircuitBreaker {
  private state: CircuitState = 'closed';
  private consecutiveFailures = 0;
  private lastFailureAt = 0;
  private halfOpenProbeInFlight = false;

  getState(): CircuitState {
    if (this.state === 'open' && Date.now() - this.lastFailureAt >= COOLDOWN_MS) {
      this.state = 'half-open';
    }
    return this.state;
  }

  /**
   * Check if a request should be allowed through.
   * In half-open state, only one probe request is allowed at a time.
   */
  allowRequest(): boolean {
    const current = this.getState();
    if (current === 'closed') return true;
    if (current === 'half-open') {
      if (this.halfOpenProbeInFlight) return false;
      this.halfOpenProbeInFlight = true;
      return true;
    }
    return false;
  }

  /**
   * Record a successful response from the collector.
   */
  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.state = 'closed';
    this.halfOpenProbeInFlight = false;
  }

  /**
   * Record a failed request to the collector (network error or 5xx).
   */
  recordFailure(): void {
    this.consecutiveFailures++;
    this.lastFailureAt = Date.now();
    this.halfOpenProbeInFlight = false;

    if (this.consecutiveFailures >= FAILURE_THRESHOLD) {
      this.state = 'open';
    }
  }

  /**
   * Get diagnostic info for health endpoints.
   */
  getInfo(): { state: CircuitState; consecutiveFailures: number; lastFailureAt: number } {
    return {
      state: this.getState(),
      consecutiveFailures: this.consecutiveFailures,
      lastFailureAt: this.lastFailureAt,
    };
  }

  /**
   * Reset for testing.
   */
  reset(): void {
    this.state = 'closed';
    this.consecutiveFailures = 0;
    this.lastFailureAt = 0;
    this.halfOpenProbeInFlight = false;
  }
}

/** Singleton circuit breaker instance */
export const collectorCircuit = new CollectorCircuitBreaker();

// =============================================================================
// Proxy Config (unchanged public API)
// =============================================================================

export function getCollectorProxyConfig(
  c: Context<Env>,
  options?: { contentType?: string }
): CollectorProxyConfig | Response {
  const tenantId = c.get('tenantId');
  const actorId = c.get('actorId');

  if (!tenantId || !actorId) {
    return c.json({ error: 'Authenticated tenant and actor required' }, 401);
  }

  const { collectorUrl, internalSecret, isProduction } = getEnvConfig(c.env);
  const headers: Record<string, string> = {};

  if (options?.contentType) {
    headers['Content-Type'] = options.contentType;
  }

  if (internalSecret) {
    headers['X-Internal-Secret'] = internalSecret;
    headers['X-Tenant-Id'] = tenantId;
    headers['X-Actor-Id'] = actorId;
    return { collectorUrl, headers };
  }

  if (isProduction) {
    return c.json({ error: 'Collector integration is not configured' }, 503);
  }

  headers['X-Dev-Tenant'] = tenantId;
  headers['X-Dev-Actor'] = actorId;
  return { collectorUrl, headers };
}

// =============================================================================
// Proxy Helper (circuit-breaker-aware)
// =============================================================================

/**
 * Proxy a request to the collector with circuit breaker protection.
 *
 * Returns a Hono Response directly — consumers can return it as-is.
 *
 * Usage:
 * ```ts
 * const result = await proxyToCollector(c, {
 *   path: '/api/collect/domain',
 *   method: 'POST',
 *   body: JSON.stringify(payload),
 * });
 * if (result instanceof Response) return result; // error response
 * return c.json(result.json, result.status);
 * ```
 */
export async function proxyToCollector(
  c: Context<Env>,
  request: ProxyRequest
): Promise<Response | ProxyResult> {
  // 1. Check circuit breaker
  if (!collectorCircuit.allowRequest()) {
    const info = collectorCircuit.getInfo();
    console.warn('[CollectorProxy] Circuit open — rejecting request', {
      path: request.path,
      ...info,
    });
    return c.json(
      {
        error: 'Collector service temporarily unavailable',
        message: `Circuit breaker is ${info.state} after ${info.consecutiveFailures} consecutive failures. Retrying in ${Math.max(0, Math.ceil((COOLDOWN_MS - (Date.now() - info.lastFailureAt)) / 1000))}s.`,
        retryAfterSeconds: Math.max(
          0,
          Math.ceil((COOLDOWN_MS - (Date.now() - info.lastFailureAt)) / 1000)
        ),
      },
      503
    );
  }

  // 2. Get proxy config (auth headers — Content-Type set by caller via request.headers)
  const proxyConfig = getCollectorProxyConfig(c);
  if (proxyConfig instanceof Response) {
    return proxyConfig;
  }

  // 3. Execute request
  const url = `${proxyConfig.collectorUrl}${request.path}`;

  // Get request ID for tracing
  const requestId = c.req.header('X-Request-ID') || crypto.randomUUID();

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
      ...proxyConfig.headers,
      ...request.headers,
    };
    const response = await fetch(url, {
      method: request.method,
      headers,
      body: request.body,
    });

    // 5xx from collector counts as a failure for circuit breaker
    if (response.status >= 500) {
      collectorCircuit.recordFailure();
      const upstream = await response.json().catch(() => ({ error: 'Collector error' }));
      return c.json(
        {
          error: (upstream as Record<string, string>).error || 'Collector request failed',
          message: (upstream as Record<string, string>).message,
        },
        response.status
      );
    }

    // Success or 4xx (client errors are not collector failures)
    collectorCircuit.recordSuccess();

    if (!response.ok) {
      const upstream = await response.json().catch(() => ({ error: 'Request failed' }));
      return c.json(upstream as Record<string, unknown>, response.status);
    }

    const json = await response.json();
    return { ok: true, status: response.status, json };
  } catch (error) {
    // Network error — collector unreachable
    collectorCircuit.recordFailure();
    const info = collectorCircuit.getInfo();
    console.error('[CollectorProxy] Network error:', error, {
      path: request.path,
      ...info,
    });
    return c.json(
      {
        error: 'Failed to connect to collector service',
        message: error instanceof Error ? error.message : 'Unknown error',
        circuitState: info.state,
      },
      503
    );
  }
}
