/**
 * Observability Module - OBS-001
 *
 * Provides structured logging, request tracing, and error aggregation
 * for the collector service.
 */
/**
 * Generate a unique request ID
 */
export declare function generateRequestId(): string;
export declare function getRequestId(requestKey: string): string | undefined;
export declare function setRequestId(requestKey: string, requestId: string): void;
export declare function clearRequestId(requestKey: string): void;
/**
 * Track an error for aggregation
 */
export declare function trackError(errorType: string, message: string): void;
/**
 * Get error aggregation summary
 */
export declare function getErrorSummary(): {
    totalErrors: number;
    byType: Record<string, {
        count: number;
        sampleMessages: string[];
    }>;
};
/**
 * Reset error counts (for testing)
 */
export declare function resetErrorCounts(): void;
/**
 * Reset all metrics (counters, histograms, error counts) - for testing
 */
export declare function resetMetrics(): void;
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
 * Increment a counter
 */
export declare function incrementCounter(name: string, labels?: Record<string, string>, value?: number): void;
/**
 * Record a histogram observation
 */
export declare function recordHistogram(name: string, value: number, labels?: Record<string, string>, buckets?: number[]): void;
/**
 * Generate Prometheus-formatted metrics output
 */
export declare function getPrometheusMetrics(): string;
/**
 * Common metric names
 */
export declare const MetricNames: {
    readonly COLLECTION_REQUESTS: "collection_requests_total";
    readonly COLLECTION_DURATION: "collection_duration_seconds";
    readonly COLLECTION_ERRORS: "collection_errors_total";
    readonly DNS_QUERIES: "dns_queries_total";
    readonly DNS_QUERY_DURATION: "dns_query_duration_seconds";
    readonly DNS_ERRORS: "dns_errors_total";
    readonly PROBE_REQUESTS: "probe_requests_total";
    readonly PROBE_DURATION: "probe_duration_seconds";
    readonly PROBE_ERRORS: "probe_errors_total";
    readonly JOB_EXECUTIONS: "job_executions_total";
    readonly JOB_DURATION: "job_duration_seconds";
    readonly JOB_RETRIES: "job_retries_total";
    readonly QUEUE_DEPTH: "queue_depth";
    readonly QUEUE_WAIT_TIME: "queue_wait_seconds";
};
/**
 * Record a collection event
 */
export declare function recordCollection(domain: string, success: boolean, durationMs: number): void;
/**
 * Record a DNS query
 */
export declare function recordDnsQuery(type: string, success: boolean, durationMs: number): void;
/**
 * Record a probe execution
 */
export declare function recordProbe(probeType: string, success: boolean, durationMs: number): void;
//# sourceMappingURL=observability.d.ts.map