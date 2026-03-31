/**
 * Observability Module - OBS-001
 *
 * Provides structured logging, request tracing, and error aggregation
 * for the collector service.
 */

import { createLogger } from '@dns-ops/logging';

// ============================================================================
// Request Tracing
// ============================================================================

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Get or create request ID for current context
 */
const requestIdContext = new Map<string, string>();

export function getRequestId(requestKey: string): string | undefined {
  return requestIdContext.get(requestKey);
}

export function setRequestId(requestKey: string, requestId: string): void {
  requestIdContext.set(requestKey, requestId);
}

export function clearRequestId(requestKey: string): void {
  requestIdContext.delete(requestKey);
}

// ============================================================================
// Error Aggregation
// ============================================================================

/**
 * Error type counters for aggregation
 */
const errorCounts: Map<string, number> = new Map();
const errorMessages: Map<string, Set<string>> = new Map();

/**
 * Track an error for aggregation
 */
export function trackError(errorType: string, message: string): void {
  errorCounts.set(errorType, (errorCounts.get(errorType) || 0) + 1);

  if (!errorMessages.has(errorType)) {
    errorMessages.set(errorType, new Set());
  }
  errorMessages.get(errorType)!.add(message);

  // Keep only last 5 unique messages per type
  const messages = errorMessages.get(errorType)!;
  if (messages.size > 5) {
    const arr = Array.from(messages);
    messages.clear();
    arr.slice(-5).forEach((m) => messages.add(m));
  }
}

/**
 * Get error aggregation summary
 */
export function getErrorSummary(): {
  totalErrors: number;
  byType: Record<string, { count: number; sampleMessages: string[] }>;
} {
  const byType: Record<string, { count: number; sampleMessages: string[] }> = {};
  let totalErrors = 0;

  for (const [type, count] of errorCounts) {
    totalErrors += count;
    byType[type] = {
      count,
      sampleMessages: Array.from(errorMessages.get(type) || []),
    };
  }

  return { totalErrors, byType };
}

/**
 * Reset error counts (for testing)
 */
export function resetErrorCounts(): void {
  errorCounts.clear();
  errorMessages.clear();
}

// ============================================================================
// Prometheus-Compatible Metrics
// ============================================================================

/**
 * Metric types for Prometheus format
 */
export interface Counter {
  value: number;
  labels: Record<string, string>;
}

export interface Histogram {
  count: number;
  sum: number;
  buckets: Record<string, number>;
}

/**
 * Internal metric storage
 */
const counters: Map<string, Counter> = new Map();
const histograms: Map<string, Histogram> = new Map();

/**
 * Increment a counter
 */
export function incrementCounter(name: string, labels: Record<string, string> = {}, value = 1): void {
  const key = metricKey(name, labels);
  const existing = counters.get(key);
  if (existing) {
    existing.value += value;
  } else {
    counters.set(key, { value, labels });
  }
}

/**
 * Record a histogram observation
 */
export function recordHistogram(
  name: string,
  value: number,
  labels: Record<string, string> = {},
  buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
): void {
  const key = metricKey(name, labels);
  let histogram = histograms.get(key);

  if (!histogram) {
    const bucketCounts: Record<string, number> = {};
    buckets.forEach((b) => {
      bucketCounts[`${b}`] = 0;
    });
    histogram = { count: 0, sum: 0, buckets: bucketCounts };
    histograms.set(key, histogram);
  }

  histogram.count++;
  histogram.sum += value;

  // Update bucket counts
  for (const bucket of buckets) {
    if (value <= bucket) {
      histogram.buckets[`${bucket}`]++;
    }
  }
}

/**
 * Generate Prometheus-formatted metrics output
 */
export function getPrometheusMetrics(): string {
  const lines: string[] = [];

  // Counters
  lines.push('# HELP dns_ops Counter metric');
  lines.push('# TYPE dns_ops counter');

  for (const [key, counter] of counters) {
    const [name, ...labelParts] = key.split(':');
    const labelStr = labelParts.length > 0 ? `{${labelParts.join(',')}}` : '';
    lines.push(`dns_ops_${name}${labelStr} ${counter.value}`);
  }

  // Histograms
  lines.push('');
  lines.push('# HELP dns_ops_histogram Histogram metric');
  lines.push('# TYPE dns_ops_histogram histogram');

  for (const [key, histogram] of histograms) {
    const [name, ...labelParts] = key.split(':');
    const labelStr = labelParts.length > 0 ? `{${labelParts.join(',')}}` : '';
    const baseLabels = labelStr.replace(/^{|}$/g, '');

    // Count and sum
    lines.push(`dns_ops_histogram_${name}_count${labelStr} ${histogram.count}`);
    lines.push(`dns_ops_histogram_${name}_sum${labelStr} ${histogram.sum}`);

    // Bucket counts (cumulative)
    let cumulative = 0;
    for (const [bucket, count] of Object.entries(histogram.buckets)) {
      cumulative += count;
      const bucketLabel = baseLabels ? `{${baseLabels},le="${bucket}"}` : `{le="${bucket}"}`;
      lines.push(`dns_ops_histogram_${name}_bucket${bucketLabel} ${cumulative}`);
    }
    // +Inf bucket
    const infLabel = baseLabels ? `{${baseLabels},le="+Inf"}` : `{le="+Inf"}`;
    lines.push(`dns_ops_histogram_${name}_bucket${infLabel} ${histogram.count}`);
  }

  // Error summary
  lines.push('');
  lines.push('# HELP dns_ops_errors_total Total error count by type');
  lines.push('# TYPE dns_ops_errors_total counter');

  const errorSummary = getErrorSummary();
  for (const [type, data] of Object.entries(errorSummary.byType)) {
    lines.push(`dns_ops_errors_total{type="${type}"} ${data.count}`);
  }

  return lines.join('\n') + '\n';
}

/**
 * Generate key for metric storage
 */
function metricKey(name: string, labels: Record<string, string>): string {
  const labelParts = Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}="${v}"`)
    .join(',');
  return `${name}:${labelParts}`;
}

// ============================================================================
// Predefined Metrics
// ============================================================================

/**
 * Common metric names
 */
export const MetricNames = {
  // Collection
  COLLECTION_REQUESTS: 'collection_requests_total',
  COLLECTION_DURATION: 'collection_duration_seconds',
  COLLECTION_ERRORS: 'collection_errors_total',

  // DNS
  DNS_QUERIES: 'dns_queries_total',
  DNS_QUERY_DURATION: 'dns_query_duration_seconds',
  DNS_ERRORS: 'dns_errors_total',

  // Probes
  PROBE_REQUESTS: 'probe_requests_total',
  PROBE_DURATION: 'probe_duration_seconds',
  PROBE_ERRORS: 'probe_errors_total',

  // Jobs
  JOB_EXECUTIONS: 'job_executions_total',
  JOB_DURATION: 'job_duration_seconds',
  JOB_RETRIES: 'job_retries_total',

  // Queue
  QUEUE_DEPTH: 'queue_depth',
  QUEUE_WAIT_TIME: 'queue_wait_seconds',
} as const;

/**
 * Record a collection event
 */
export function recordCollection(domain: string, success: boolean, durationMs: number): void {
  incrementCounter(MetricNames.COLLECTION_REQUESTS, { domain, status: success ? 'success' : 'failure' });
  recordHistogram(MetricNames.COLLECTION_DURATION, durationMs / 1000, { domain });
  if (!success) {
    incrementCounter(MetricNames.COLLECTION_ERRORS, { domain, type: 'collection_failed' });
  }
}

/**
 * Record a DNS query
 */
export function recordDnsQuery(type: string, success: boolean, durationMs: number): void {
  incrementCounter(MetricNames.DNS_QUERIES, { type, status: success ? 'success' : 'failure' });
  recordHistogram(MetricNames.DNS_QUERY_DURATION, durationMs / 1000, { type });
}

/**
 * Record a probe execution
 */
export function recordProbe(probeType: string, success: boolean, durationMs: number): void {
  incrementCounter(MetricNames.PROBE_REQUESTS, { type: probeType, status: success ? 'success' : 'failure' });
  recordHistogram(MetricNames.PROBE_DURATION, durationMs / 1000, { type: probeType });
  if (!success) {
    trackError(`probe_${probeType}`, 'Probe failed');
  }
}
