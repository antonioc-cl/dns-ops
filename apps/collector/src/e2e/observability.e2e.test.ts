/**
 * E2E Integration Tests: Observability Module - OBS-001
 *
 * Tests that verify observability functionality.
 * Uses unique metric names per test to avoid state pollution.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import * as observability from '../middleware/observability.js';

describe('Observability Module E2E', () => {
  beforeEach(() => {
    observability.resetErrorCounts();
  });

  describe('Request ID Generation', () => {
    it('should generate unique IDs', () => {
      const id1 = observability.generateRequestId();
      const id2 = observability.generateRequestId();

      expect(id1).not.toBe(id2);
    });

    it('should generate IDs in expected format', () => {
      const id = observability.generateRequestId();

      // Format should be timestamp-random
      expect(id).toMatch(/^[0-9a-z]+-[0-9a-z]+$/);
    });

    it('should support request ID context storage', () => {
      const requestKey = `test-request-${Date.now()}-${Math.random()}`;
      const requestId = observability.generateRequestId();

      observability.setRequestId(requestKey, requestId);
      expect(observability.getRequestId(requestKey)).toBe(requestId);

      observability.clearRequestId(requestKey);
      expect(observability.getRequestId(requestKey)).toBeUndefined();
    });
  });

  describe('Error Aggregation', () => {
    it('should track error counts by type', () => {
      observability.trackError('network_error', 'Connection refused');
      observability.trackError('network_error', 'Connection timeout');
      observability.trackError('validation_error', 'Invalid domain');

      const summary = observability.getErrorSummary();

      expect(summary.totalErrors).toBe(3);
      expect(summary.byType['network_error'].count).toBe(2);
      expect(summary.byType['validation_error'].count).toBe(1);
    });

    it('should limit sample messages per error type', () => {
      const errorType = `test_error_${Date.now()}`;

      // Add more than 5 unique messages
      for (let i = 0; i < 10; i++) {
        observability.trackError(errorType, `Error message ${i}`);
      }

      const summary = observability.getErrorSummary();
      const samples = summary.byType[errorType].sampleMessages;

      // Should only keep last 5
      expect(samples.length).toBeLessThanOrEqual(5);
    });

    it('should reset error counts', () => {
      observability.trackError('error1', 'Message 1');
      observability.trackError('error2', 'Message 2');

      observability.resetErrorCounts();

      const summary = observability.getErrorSummary();
      expect(summary.totalErrors).toBe(0);
      expect(Object.keys(summary.byType)).toHaveLength(0);
    });
  });

  describe('Counter Metrics', () => {
    it('should increment counter with labels', () => {
      const counterName = `test_counter_${Date.now()}`;

      observability.incrementCounter(counterName, { label: 'value' });
      observability.incrementCounter(counterName, { label: 'value' });
      observability.incrementCounter(counterName, { label: 'value' }, 5);

      const metrics = observability.getPrometheusMetrics();
      expect(metrics).toContain(`${counterName}{label="value"} 7`);
    });

    it('should track separate counters by labels', () => {
      const counterName = `status_counter_${Date.now()}`;

      observability.incrementCounter(counterName, { status: 'success' });
      observability.incrementCounter(counterName, { status: 'error' });
      observability.incrementCounter(counterName, { status: 'error' });

      const metrics = observability.getPrometheusMetrics();
      expect(metrics).toContain(`${counterName}{status="success"} 1`);
      expect(metrics).toContain(`${counterName}{status="error"} 2`);
    });
  });

  describe('Histogram Metrics', () => {
    it('should record histogram observations', () => {
      const histName = `test_hist_${Date.now()}`;

      observability.recordHistogram(histName, 0.5, { endpoint: '/api/test' });
      observability.recordHistogram(histName, 1.0, { endpoint: '/api/test' });
      observability.recordHistogram(histName, 1.5, { endpoint: '/api/test' });

      const metrics = observability.getPrometheusMetrics();
      expect(metrics).toContain(`${histName}_count{endpoint="/api/test"} 3`);
      expect(metrics).toContain(`${histName}_sum{endpoint="/api/test"} 3`);
    });

    it('should track histogram bucket counts', () => {
      // Create unique name to avoid collision with other tests
      const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const histName = `latency_${uniqueId}`;
      const buckets = [0.005, 0.01, 0.025, 0.05, 0.1];

      observability.recordHistogram(histName, 0.01, {}, buckets);
      observability.recordHistogram(histName, 0.03, {}, buckets);
      observability.recordHistogram(histName, 0.1, {}, buckets);

      const metrics = observability.getPrometheusMetrics();

      // Check that histogram is recorded with correct prefix
      expect(metrics).toContain(`dns_ops_histogram_${histName}_count`);
      expect(metrics).toContain(`dns_ops_histogram_${histName}_sum`);

      // Check that buckets are recorded - use substring match since we can't reset
      expect(metrics).toContain(`${histName}_bucket{le="0.01"}`);
      expect(metrics).toContain(`${histName}_bucket{le="0.1"}`);
    });

    it('should include +Inf bucket in histogram', () => {
      const histName = `simple_${Date.now()}`;

      observability.recordHistogram(histName, 1.0);

      const metrics = observability.getPrometheusMetrics();
      expect(metrics).toContain(`${histName}_bucket{le="+Inf"}`);
    });
  });

  describe('Prometheus Format Output', () => {
    it('should include HELP and TYPE comments', () => {
      const metricName = `metric_help_${Date.now()}`;
      observability.incrementCounter(metricName);

      const metrics = observability.getPrometheusMetrics();
      expect(metrics).toContain('# HELP dns_ops');
      expect(metrics).toContain('# TYPE dns_ops counter');
    });

    it('should format labels correctly', () => {
      const metricName = `labeled_${Date.now()}`;
      observability.incrementCounter(metricName, { name: 'test', type: 'example' });

      const metrics = observability.getPrometheusMetrics();
      expect(metrics).toContain(`${metricName}{name="test",type="example"}`);
    });

    it('should include error summary in output', () => {
      const errorType = `test_error_${Date.now()}`;
      observability.trackError(errorType, 'Test message');

      const metrics = observability.getPrometheusMetrics();
      expect(metrics).toContain('dns_ops_errors_total');
      expect(metrics).toContain(errorType);
    });
  });

  describe('Domain-Specific Helpers', () => {
    it('should provide recordCollection function', () => {
      expect(typeof observability.recordCollection).toBe('function');
    });

    it('should provide recordDnsQuery function', () => {
      expect(typeof observability.recordDnsQuery).toBe('function');
    });

    it('should provide recordProbe function', () => {
      expect(typeof observability.recordProbe).toBe('function');
    });

    it('should track error on failed probe', () => {
      const probeType = `probe_${Date.now()}`;
      observability.recordProbe(probeType, false, 100);

      const summary = observability.getErrorSummary();
      expect(summary.byType[`probe_${probeType}`]).toBeDefined();
    });
  });

  describe('MetricNames Constants', () => {
    it('should have expected metric names', () => {
      expect(observability.MetricNames.COLLECTION_REQUESTS).toBe('collection_requests_total');
      expect(observability.MetricNames.COLLECTION_DURATION).toBe('collection_duration_seconds');
      expect(observability.MetricNames.DNS_QUERIES).toBe('dns_queries_total');
      expect(observability.MetricNames.PROBE_REQUESTS).toBe('probe_requests_total');
      expect(observability.MetricNames.JOB_EXECUTIONS).toBe('job_executions_total');
    });
  });
});
