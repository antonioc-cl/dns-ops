/**
 * Feedback loop metrics singleton for the web service.
 *
 * Wraps `@dns-ops/logging` metrics so route handlers can
 * emit remediation / shadow / alert counters without
 * constructing a MetricsCollector themselves.
 */

import { createFeedbackLoopMetrics, type FeedbackLoopMetrics } from '@dns-ops/logging';
import { getWebLogger } from '../middleware/error-tracking.js';

let instance: FeedbackLoopMetrics | undefined;

/**
 * Return (and lazily create) the global FeedbackLoopMetrics.
 */
export function getFeedbackMetrics(): FeedbackLoopMetrics {
  if (!instance) {
    instance = createFeedbackLoopMetrics(getWebLogger());
  }
  return instance;
}
