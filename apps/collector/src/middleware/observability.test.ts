/**
 * Observability Tests - OBS-001
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  generateRequestId,
  getErrorSummary,
  getPrometheusMetrics,
  incrementCounter,
  recordCollection,
  recordDnsQuery,
  recordHistogram,
  recordProbe,
  resetErrorCounts,
  trackError,
} from './observability.js';

describe('Observability', () => {
  describe('Request ID Generation', () => {
    it('should generate unique request IDs', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^[0-9a-z]+-[0-9a-z]+$/);
    });
  });

  describe('Error Tracking', () => {
    beforeEach(() => {
      resetErrorCounts();
    });

    it('should track error counts by type', () => {
      trackError('network_error', 'Connection refused');
      trackError('network_error', 'Connection timeout');
      trackError('validation_error', 'Invalid domain');

      const summary = getErrorSummary();
      expect(summary.totalErrors).toBe(3);
      expect(summary.byType.network_error.count).toBe(2);
      expect(summary.byType.validation_error.count).toBe(1);
    });

    it('should limit sample messages per type', () => {
      for (let i = 0; i < 10; i++) {
        trackError('test_error', `Error message ${i}`);
      }

      const summary = getErrorSummary();
      expect(summary.byType.test_error.sampleMessages.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Metrics Output', () => {
    beforeEach(() => {
      resetErrorCounts();
    });

    it('should include HELP and TYPE comments', () => {
      const metrics = getPrometheusMetrics();
      expect(metrics).toContain('# HELP dns_ops');
      expect(metrics).toContain('# TYPE dns_ops');
    });

    it('should include error counts in output', () => {
      trackError('probe_failed', 'Connection refused');
      trackError('probe_failed', 'Timeout');

      const metrics = getPrometheusMetrics();
      expect(metrics).toContain('dns_ops_errors_total');
      expect(metrics).toContain('probe_failed');
    });

    it('should output Prometheus-formatted metrics', () => {
      // Test basic counter output
      incrementCounter('test_metric', { label: 'value' }, 5);
      const metrics = getPrometheusMetrics();
      expect(metrics).toContain('test_metric');
    });
  });

  describe('Domain Metric Helpers', () => {
    beforeEach(() => {
      resetErrorCounts();
    });

    it('should provide recordCollection function', () => {
      expect(typeof recordCollection).toBe('function');
      recordCollection('test.com', true, 100);
    });

    it('should provide recordDnsQuery function', () => {
      expect(typeof recordDnsQuery).toBe('function');
      recordDnsQuery('A', true, 50);
    });

    it('should provide recordProbe function', () => {
      expect(typeof recordProbe).toBe('function');
      recordProbe('smtp_starttls', true, 200);
    });
  });

  describe('Histogram Recording', () => {
    it('should record histogram observations', () => {
      recordHistogram('test_histogram', 0.5, { endpoint: '/test' });
      const metrics = getPrometheusMetrics();
      expect(metrics).toContain('test_histogram');
    });
  });
});
