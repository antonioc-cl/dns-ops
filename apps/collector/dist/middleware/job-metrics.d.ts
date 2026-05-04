/**
 * Job Metrics — per-job structured metric emission
 *
 * Wraps @dns-ops/logging JobMetrics with the collector's logger instance.
 * Emits counter/histogram/gauge events for job success, failure, duration, and queue depth.
 */
import { type JobMetrics } from '@dns-ops/logging';
/**
 * Get or create singleton JobMetrics instance
 */
export declare function getJobMetrics(): JobMetrics;
//# sourceMappingURL=job-metrics.d.ts.map