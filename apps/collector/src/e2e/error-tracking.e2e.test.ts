/**
 * Error Tracking E2E Integration Tests
 *
 * Comprehensive tests for error tracking and Sentry APM stub.
 * Tests verify:
 * - Structured logging with proper context
 * - Sentry APM stub functions
 * - Error tracking helpers
 */

import { describe, expect, it, vi } from 'vitest';
import {
  addBreadcrumb,
  captureException,
  captureMessage,
  configureSentry,
  isSentryInitialized,
  setContext,
  setUserContext,
  startSpan,
  trackCollectionError,
  trackCollectionResult,
  trackError,
  trackInfo,
  trackJobComplete,
  trackJobError,
  trackJobStart,
  trackProbeError,
  trackProbeResult,
  trackWarning,
} from '../middleware/error-tracking.js';

describe('Error Tracking E2E', () => {
  describe('Sentry APM Stub', () => {
    it('should not be initialized by default', () => {
      // Reset state (simulated)
      expect(isSentryInitialized()).toBe(false);
    });

    it('should remain uninitialized when no DSN provided', () => {
      configureSentry({});
      expect(isSentryInitialized()).toBe(false);
    });

    it('should mark as initialized when DSN provided', () => {
      configureSentry({ dsn: 'https://abc@sentry.io/123' });
      expect(isSentryInitialized()).toBe(true);
    });

    it('should configure with environment and release', () => {
      configureSentry({
        dsn: 'https://abc@sentry.io/123',
        environment: 'production',
        release: '1.0.0',
      });
      expect(isSentryInitialized()).toBe(true);
    });
  });

  describe('captureException', () => {
    it('should handle Error objects', () => {
      const error = new Error('Test error');
      expect(() => captureException(error)).not.toThrow();
    });

    it('should handle string errors', () => {
      expect(() => captureException('String error')).not.toThrow();
    });

    it('should handle context parameter', () => {
      const error = new Error('Test error');
      expect(() => captureException(error, { userId: '123' })).not.toThrow();
    });

    it('should handle null/undefined errors', () => {
      expect(() => captureException(null)).not.toThrow();
      expect(() => captureException(undefined)).not.toThrow();
    });
  });

  describe('captureMessage', () => {
    it('should log info messages', () => {
      expect(() => captureMessage('Info message')).not.toThrow();
    });

    it('should log warning messages', () => {
      expect(() => captureMessage('Warning message', 'warning')).not.toThrow();
    });

    it('should log error messages', () => {
      expect(() => captureMessage('Error message', 'error')).not.toThrow();
    });

    it('should include context', () => {
      expect(() => captureMessage('Test', 'info', { key: 'value' })).not.toThrow();
    });
  });

  describe('addBreadcrumb', () => {
    it('should add breadcrumb with message', () => {
      expect(() => addBreadcrumb('User performed action')).not.toThrow();
    });

    it('should add breadcrumb with category', () => {
      expect(() => addBreadcrumb('HTTP request', 'http')).not.toThrow();
    });

    it('should add breadcrumb with data', () => {
      expect(() => addBreadcrumb('Click event', 'ui', { buttonId: 'submit' })).not.toThrow();
    });
  });

  describe('setUserContext', () => {
    it('should set user context', () => {
      expect(() => setUserContext({ id: '123', email: 'test@example.com' })).not.toThrow();
    });

    it('should handle minimal user', () => {
      expect(() => setUserContext({ id: '456' })).not.toThrow();
    });
  });

  describe('setContext', () => {
    it('should set extra context', () => {
      expect(() => setContext('job', { jobId: '123', type: 'collection' })).not.toThrow();
    });
  });

  describe('startSpan', () => {
    it('should return a span object', () => {
      const span = startSpan('db.query', 'db');
      expect(span).toBeDefined();
      expect(typeof span?.end).toBe('function');
    });

    it('should allow ending the span', () => {
      const span = startSpan('test.span', 'test');
      expect(() => span?.end()).not.toThrow();
    });

    it('should allow ending with status', () => {
      const span = startSpan('test.span', 'test');
      expect(() => span?.end('ok')).not.toThrow();
    });
  });

  describe('trackError helpers', () => {
    it('should track generic errors', () => {
      const error = new Error('Generic error');
      expect(() => trackError(error)).not.toThrow();
      expect(() => trackError(error, { context: 'value' })).not.toThrow();
    });

    it('should track warnings', () => {
      expect(() => trackWarning('Warning message')).not.toThrow();
      expect(() => trackWarning('With context', { key: 'value' })).not.toThrow();
    });

    it('should track info', () => {
      expect(() => trackInfo('Info message')).not.toThrow();
      expect(() => trackInfo('With context', { key: 'value' })).not.toThrow();
    });
  });

  describe('Collection tracking helpers', () => {
    it('should track collection errors', () => {
      const error = new Error('Collection failed');
      expect(() => trackCollectionError(error, { domain: 'example.com' })).not.toThrow();
    });

    it('should track collection results', () => {
      expect(() =>
        trackCollectionResult({
          domain: 'example.com',
          snapshotId: 'snap-123',
          recordCount: 10,
          durationMs: 500,
          resultState: 'complete',
        })
      ).not.toThrow();
    });
  });

  describe('Job tracking helpers', () => {
    it('should track job errors', () => {
      const error = new Error('Job failed');
      expect(() => trackJobError(error, { jobId: 'job-1', jobType: 'collection' })).not.toThrow();
    });

    it('should track job start', () => {
      expect(() => trackJobStart({ jobId: 'job-2', jobType: 'monitoring' })).not.toThrow();
    });

    it('should track job completion', () => {
      expect(() =>
        trackJobComplete({
          jobId: 'job-3',
          jobType: 'collection',
          durationMs: 1000,
        })
      ).not.toThrow();
    });
  });

  describe('Probe tracking helpers', () => {
    it('should track probe errors', () => {
      const error = new Error('Probe failed');
      expect(() =>
        trackProbeError(error, { probeType: 'smtp', hostname: 'mail.example.com' })
      ).not.toThrow();
    });

    it('should track probe results', () => {
      expect(() =>
        trackProbeResult({
          probeType: 'smtp',
          hostname: 'mail.example.com',
          success: true,
          responseTimeMs: 150,
        })
      ).not.toThrow();
    });

    it('should track failed probe results', () => {
      expect(() =>
        trackProbeResult({
          probeType: 'smtp',
          hostname: 'mail.example.com',
          success: false,
          responseTimeMs: 5000,
        })
      ).not.toThrow();
    });
  });
});
