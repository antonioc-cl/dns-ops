/**
 * Job Metrics — per-job structured metric emission
 *
 * Wraps @dns-ops/logging JobMetrics with the collector's logger instance.
 * Emits counter/histogram/gauge events for job success, failure, duration, and queue depth.
 */

import { createMetricsCollector, type JobMetrics } from '@dns-ops/logging';
import { getCollectorLogger } from './error-tracking.js';

let _jobMetrics: JobMetrics | null = null;

/**
 * Get or create singleton JobMetrics instance
 */
export function getJobMetrics(): JobMetrics {
  if (!_jobMetrics) {
    const logger = getCollectorLogger();
    const collector = createMetricsCollector(logger, 'dns_ops');
    _jobMetrics = collector.createJobMetrics();
  }
  return _jobMetrics;
}
