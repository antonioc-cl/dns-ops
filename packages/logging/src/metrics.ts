/**
 * Feedback Loop Metrics - Bead 14.6
 *
 * Tracks key product quality metrics for:
 * - Remediation outcomes (completion rate, time-to-resolution)
 * - Shadow comparison results (parity rate, mismatch types)
 * - Alert noise (acknowledge rate, suppression rate, time-to-ack)
 *
 * These metrics help measure system health and identify areas for improvement.
 *
 * @example
 * ```typescript
 * import { metrics } from '@dns-ops/logging';
 *
 * // Track remediation completion
 * metrics.remediation.created({ tenantId, domainId, type: 'dkim-setup' });
 * metrics.remediation.completed({ tenantId, domainId, type: 'dkim-setup', durationMs: 86400000 });
 *
 * // Track shadow comparison
 * metrics.shadow.comparisonRun({ domain, provider, hadMismatch: true });
 *
 * // Track alert lifecycle
 * metrics.alerts.created({ tenantId, domain, severity: 'high' });
 * metrics.alerts.acknowledged({ tenantId, domain, timeToAckMs: 3600000 });
 * ```
 */

import type { LogContext, Logger } from './logger.js';

/**
 * Metric event types for structured metric emission
 */
export type MetricType =
  | 'counter' // Incremental count (e.g., "remediations created")
  | 'gauge' // Point-in-time value (e.g., "active alerts")
  | 'histogram' // Distribution (e.g., "time to acknowledge")
  | 'summary'; // Similar to histogram, with percentiles

/**
 * A single metric data point
 */
export interface MetricEvent {
  name: string;
  type: MetricType;
  value: number;
  labels: Record<string, string>;
  timestamp: string;
}

/**
 * Remediation outcome metrics
 */
export interface RemediationMetrics {
  /** Track when a remediation request is created */
  created(context: { tenantId?: string; domainId?: string; type: string; priority?: string }): void;

  /** Track when a remediation is started (in_progress) */
  started(context: {
    tenantId?: string;
    domainId?: string;
    type: string;
    timeToStartMs?: number;
  }): void;

  /** Track when a remediation is completed successfully */
  completed(context: {
    tenantId?: string;
    domainId?: string;
    type: string;
    durationMs: number;
  }): void;

  /** Track when a remediation fails */
  failed(context: {
    tenantId?: string;
    domainId?: string;
    type: string;
    reason: string;
    durationMs?: number;
  }): void;

  /** Track when a remediation is cancelled */
  cancelled(context: { tenantId?: string; domainId?: string; type: string; reason?: string }): void;
}

/**
 * Shadow comparison metrics
 */
export interface ShadowMetrics {
  /** Track a shadow comparison run */
  comparisonRun(context: {
    domain?: string;
    provider?: string;
    hadMismatch: boolean;
    mismatchTypes?: string[];
    latencyMs?: number;
  }): void;

  /** Track parity adjudication */
  adjudicated(context: {
    comparisonId: string;
    provider?: string;
    verdict: 'accept-new' | 'keep-legacy' | 'investigate';
    reason?: string;
  }): void;

  /** Track parity rate over time (gauge) */
  parityRate(context: {
    provider?: string;
    rate: number; // 0-1
  }): void;
}

/**
 * Alert noise metrics
 */
export interface AlertMetrics {
  /** Track alert creation */
  created(context: {
    tenantId?: string;
    domain?: string;
    type?: string;
    severity: string;
    dedupKey?: string;
  }): void;

  /** Track alert acknowledgment */
  acknowledged(context: { tenantId?: string; alertId: string; timeToAckMs: number }): void;

  /** Track alert resolution */
  resolved(context: {
    tenantId?: string;
    alertId: string;
    timeToResolveMs: number;
    resolution: 'manual' | 'auto-resolved' | 'expired';
  }): void;

  /** Track alert suppression */
  suppressed(context: {
    tenantId?: string;
    alertId: string;
    suppressionReason?: string;
    suppressionDurationMs?: number;
  }): void;

  /** Track deduplicated alerts (noise reduction) */
  deduplicated(context: {
    tenantId?: string;
    domain?: string;
    dedupKey: string;
    duplicateCount: number;
  }): void;

  /** Track active alert count (gauge) */
  activeCount(context: { tenantId?: string; severity?: string; count: number }): void;
}

/**
 * Metrics collector that emits structured metric events
 */
export class MetricsCollector {
  private logger: Logger;
  private prefix: string;

  constructor(logger: Logger, prefix: string = 'dns_ops') {
    this.logger = logger;
    this.prefix = prefix;
  }

  /**
   * Emit a counter metric (incremental)
   */
  counter(name: string, value: number, labels: Record<string, string>): void {
    this.emit({
      name: `${this.prefix}_${name}`,
      type: 'counter',
      value,
      labels,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit a gauge metric (point-in-time)
   */
  gauge(name: string, value: number, labels: Record<string, string>): void {
    this.emit({
      name: `${this.prefix}_${name}`,
      type: 'gauge',
      value,
      labels,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit a histogram metric (distribution)
   */
  histogram(name: string, value: number, labels: Record<string, string>): void {
    this.emit({
      name: `${this.prefix}_${name}`,
      type: 'histogram',
      value,
      labels,
      timestamp: new Date().toISOString(),
    });
  }

  private emit(event: MetricEvent): void {
    // Log as structured event that can be scraped or sent to metrics backend
    this.logger.info('metric', {
      metricName: event.name,
      metricType: event.type,
      metricValue: event.value,
      ...event.labels,
    } as LogContext);
  }

  /**
   * Create remediation metrics tracker
   */
  createRemediationMetrics(): RemediationMetrics {
    return {
      created: (ctx) => {
        this.counter('remediation_created_total', 1, {
          tenant_id: ctx.tenantId ?? 'unknown',
          type: ctx.type,
          priority: ctx.priority ?? 'normal',
        });
      },
      started: (ctx) => {
        this.counter('remediation_started_total', 1, {
          tenant_id: ctx.tenantId ?? 'unknown',
          type: ctx.type,
        });
        if (ctx.timeToStartMs !== undefined) {
          this.histogram('remediation_time_to_start_ms', ctx.timeToStartMs, {
            type: ctx.type,
          });
        }
      },
      completed: (ctx) => {
        this.counter('remediation_completed_total', 1, {
          tenant_id: ctx.tenantId ?? 'unknown',
          type: ctx.type,
        });
        this.histogram('remediation_duration_ms', ctx.durationMs, {
          type: ctx.type,
          outcome: 'success',
        });
      },
      failed: (ctx) => {
        this.counter('remediation_failed_total', 1, {
          tenant_id: ctx.tenantId ?? 'unknown',
          type: ctx.type,
          reason: ctx.reason,
        });
        if (ctx.durationMs !== undefined) {
          this.histogram('remediation_duration_ms', ctx.durationMs, {
            type: ctx.type,
            outcome: 'failure',
          });
        }
      },
      cancelled: (ctx) => {
        this.counter('remediation_cancelled_total', 1, {
          tenant_id: ctx.tenantId ?? 'unknown',
          type: ctx.type,
          reason: ctx.reason ?? 'user_request',
        });
      },
    };
  }

  /**
   * Create shadow comparison metrics tracker
   */
  createShadowMetrics(): ShadowMetrics {
    return {
      comparisonRun: (ctx) => {
        this.counter('shadow_comparison_total', 1, {
          provider: ctx.provider ?? 'unknown',
          had_mismatch: String(ctx.hadMismatch),
        });
        if (ctx.latencyMs !== undefined) {
          this.histogram('shadow_comparison_latency_ms', ctx.latencyMs, {
            provider: ctx.provider ?? 'unknown',
          });
        }
        if (ctx.hadMismatch && ctx.mismatchTypes) {
          for (const mismatchType of ctx.mismatchTypes) {
            this.counter('shadow_mismatch_total', 1, {
              provider: ctx.provider ?? 'unknown',
              mismatch_type: mismatchType,
            });
          }
        }
      },
      adjudicated: (ctx) => {
        this.counter('shadow_adjudication_total', 1, {
          provider: ctx.provider ?? 'unknown',
          verdict: ctx.verdict,
        });
      },
      parityRate: (ctx) => {
        this.gauge('shadow_parity_rate', ctx.rate, {
          provider: ctx.provider ?? 'all',
        });
      },
    };
  }

  /**
   * Create alert metrics tracker
   */
  createAlertMetrics(): AlertMetrics {
    return {
      created: (ctx) => {
        this.counter('alert_created_total', 1, {
          tenant_id: ctx.tenantId ?? 'unknown',
          type: ctx.type ?? 'unknown',
          severity: ctx.severity,
        });
      },
      acknowledged: (ctx) => {
        this.counter('alert_acknowledged_total', 1, {
          tenant_id: ctx.tenantId ?? 'unknown',
        });
        this.histogram('alert_time_to_ack_ms', ctx.timeToAckMs, {
          tenant_id: ctx.tenantId ?? 'unknown',
        });
      },
      resolved: (ctx) => {
        this.counter('alert_resolved_total', 1, {
          tenant_id: ctx.tenantId ?? 'unknown',
          resolution: ctx.resolution,
        });
        this.histogram('alert_time_to_resolve_ms', ctx.timeToResolveMs, {
          tenant_id: ctx.tenantId ?? 'unknown',
          resolution: ctx.resolution,
        });
      },
      suppressed: (ctx) => {
        this.counter('alert_suppressed_total', 1, {
          tenant_id: ctx.tenantId ?? 'unknown',
          reason: ctx.suppressionReason ?? 'manual',
        });
        if (ctx.suppressionDurationMs !== undefined) {
          this.histogram('alert_suppression_duration_ms', ctx.suppressionDurationMs, {
            tenant_id: ctx.tenantId ?? 'unknown',
          });
        }
      },
      deduplicated: (ctx) => {
        this.counter('alert_deduplicated_total', 1, {
          tenant_id: ctx.tenantId ?? 'unknown',
        });
        this.histogram('alert_duplicate_count', ctx.duplicateCount, {
          tenant_id: ctx.tenantId ?? 'unknown',
        });
      },
      activeCount: (ctx) => {
        this.gauge('alert_active_count', ctx.count, {
          tenant_id: ctx.tenantId ?? 'all',
          severity: ctx.severity ?? 'all',
        });
      },
    };
  }
}

/**
 * Create a metrics collector instance
 */
export function createMetricsCollector(logger: Logger, prefix?: string): MetricsCollector {
  return new MetricsCollector(logger, prefix);
}

/**
 * Convenience type for all metrics
 */
export interface FeedbackLoopMetrics {
  remediation: RemediationMetrics;
  shadow: ShadowMetrics;
  alerts: AlertMetrics;
}

/**
 * Create all feedback loop metrics trackers
 */
export function createFeedbackLoopMetrics(logger: Logger, prefix?: string): FeedbackLoopMetrics {
  const collector = createMetricsCollector(logger, prefix);
  return {
    remediation: collector.createRemediationMetrics(),
    shadow: collector.createShadowMetrics(),
    alerts: collector.createAlertMetrics(),
  };
}
