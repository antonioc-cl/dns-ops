/**
 * Error Tracking E2E Integration Tests
 *
 * Tests verify:
 * - Structured logging with proper context
 * - ErrorTrackingConfig.onError hook behavior in middleware and handler
 * - Error tracking helpers
 */

import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import {
  createErrorHandler,
  createErrorTrackingMiddleware,
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
import type { Env } from '../types.js';

describe('Error Tracking E2E', () => {
  describe('ErrorTrackingConfig.onError extension point', () => {
    it('createErrorTrackingMiddleware accepts onError hook', () => {
      const onError = vi.fn();
      const middleware = createErrorTrackingMiddleware({ onError });
      expect(typeof middleware).toBe('function');
    });

    it('createErrorHandler calls onError for 5xx errors', async () => {
      const onError = vi.fn();
      const app = new Hono<Env>();

      app.onError(createErrorHandler({ onError }));

      app.get('/boom', () => {
        throw new Error('server-error');
      });

      const res = await app.request('/boom');
      expect(res.status).toBe(500);

      // Fire-and-forget — wait one microtask tick
      await new Promise((r) => setTimeout(r, 10));
      expect(onError).toHaveBeenCalledOnce();

      const [error, context] = onError.mock.calls[0];
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('server-error');
      expect(context.statusCode).toBe(500);
      expect(context.method).toBe('GET');
      expect(context.path).toBe('/boom');
    });

    it('createErrorHandler does NOT call onError for 4xx errors', async () => {
      const onError = vi.fn();
      const app = new Hono<Env>();

      app.onError(createErrorHandler({ onError }));

      app.get('/bad', () => {
        const err = new Error('bad request');
        (err as Error & { status: number }).status = 400;
        throw err;
      });

      const res = await app.request('/bad');
      expect(res.status).toBe(400);

      await new Promise((r) => setTimeout(r, 10));
      expect(onError).not.toHaveBeenCalled();
    });

    it('createErrorHandler returns JSON error envelope', async () => {
      const app = new Hono<Env>();
      app.onError(createErrorHandler());

      app.get('/boom', () => {
        throw new Error('test-error');
      });

      const res = await app.request('/boom');
      expect(res.status).toBe(500);
      const body = (await res.json()) as { error: string; requestId: string };
      expect(body.error).toBe('Internal Server Error');
      expect(body.requestId).toBeDefined();
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
