/**
 * Observability Module - OBS-001
 *
 * Provides structured logging, request tracing, and error aggregation
 * for the collector service.
 */
// @dns-ops/logging is available but currently unused in this module
// import { createLogger } from '@dns-ops/logging';
// ============================================================================
// Request Tracing
// ============================================================================
/**
 * Generate a unique request ID
 */
export function generateRequestId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
/**
 * Get or create request ID for current context
 */
const requestIdContext = new Map();
export function getRequestId(requestKey) {
    return requestIdContext.get(requestKey);
}
export function setRequestId(requestKey, requestId) {
    requestIdContext.set(requestKey, requestId);
}
export function clearRequestId(requestKey) {
    requestIdContext.delete(requestKey);
}
// ============================================================================
// Error Aggregation
// ============================================================================
/**
 * Error type counters for aggregation
 */
const errorCounts = new Map();
const errorMessages = new Map();
/**
 * Track an error for aggregation
 */
export function trackError(errorType, message) {
    errorCounts.set(errorType, (errorCounts.get(errorType) || 0) + 1);
    if (!errorMessages.has(errorType)) {
        errorMessages.set(errorType, new Set());
    }
    errorMessages.get(errorType)?.add(message);
    // Keep only last 5 unique messages per type
    const messages = errorMessages.get(errorType);
    if (messages && messages.size > 5) {
        const arr = Array.from(messages);
        messages.clear();
        arr.slice(-5).forEach((m) => messages.add(m));
    }
}
/**
 * Get error aggregation summary
 */
export function getErrorSummary() {
    const byType = {};
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
export function resetErrorCounts() {
    errorCounts.clear();
    errorMessages.clear();
}
/**
 * Reset all metrics (counters, histograms, error counts) - for testing
 */
export function resetMetrics() {
    resetErrorCounts();
    counters.clear();
    histograms.clear();
}
/**
 * Internal metric storage
 */
const counters = new Map();
const histograms = new Map();
/**
 * Increment a counter
 */
export function incrementCounter(name, labels = {}, value = 1) {
    const key = metricKey(name, labels);
    const existing = counters.get(key);
    if (existing) {
        existing.value += value;
    }
    else {
        counters.set(key, { value, labels });
    }
}
/**
 * Record a histogram observation
 */
export function recordHistogram(name, value, labels = {}, buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]) {
    const key = metricKey(name, labels);
    let histogram = histograms.get(key);
    if (!histogram) {
        const bucketCounts = {};
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
export function getPrometheusMetrics() {
    const lines = [];
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
    return `${lines.join('\n')}\n`;
}
/**
 * Generate key for metric storage
 */
function metricKey(name, labels) {
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
};
/**
 * Record a collection event
 */
export function recordCollection(domain, success, durationMs) {
    incrementCounter(MetricNames.COLLECTION_REQUESTS, {
        domain,
        status: success ? 'success' : 'failure',
    });
    recordHistogram(MetricNames.COLLECTION_DURATION, durationMs / 1000, { domain });
    if (!success) {
        incrementCounter(MetricNames.COLLECTION_ERRORS, { domain, type: 'collection_failed' });
    }
}
/**
 * Record a DNS query
 */
export function recordDnsQuery(type, success, durationMs) {
    incrementCounter(MetricNames.DNS_QUERIES, { type, status: success ? 'success' : 'failure' });
    recordHistogram(MetricNames.DNS_QUERY_DURATION, durationMs / 1000, { type });
}
/**
 * Record a probe execution
 */
export function recordProbe(probeType, success, durationMs) {
    incrementCounter(MetricNames.PROBE_REQUESTS, {
        type: probeType,
        status: success ? 'success' : 'failure',
    });
    recordHistogram(MetricNames.PROBE_DURATION, durationMs / 1000, { type: probeType });
    if (!success) {
        trackError(`probe_${probeType}`, 'Probe failed');
    }
}
//# sourceMappingURL=observability.js.map