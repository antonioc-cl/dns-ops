/**
 * Error Reporter Integration Tests
 *
 * Verifies that createErrorTrackingMiddleware and createErrorHandler
 * delegate to the centralised ErrorReporter (from @dns-ops/logging) when
 * no custom onError hook is configured.
 *
 * Uses a selective mock of @dns-ops/logging that replaces only
 * createErrorReporter while preserving createLogger and other exports.
 */

import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../types.js';

// ---------------------------------------------------------------------------
// Selective mock — keep createLogger/createLoggingMiddleware working
// ---------------------------------------------------------------------------

const mockReport = vi.fn().mockResolvedValue(undefined);
const mockReporter = { report: mockReport };

vi.mock('@dns-ops/logging', async (importOriginal) => {
  const original = await importOriginal<typeof import('@dns-ops/logging')>();
  return {
    ...original,
    createErrorReporter: vi.fn().mockReturnValue(mockReporter),
  };
});

describe('Error Reporter Integration', () => {
  beforeEach(() => {
    mockReport.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // createErrorHandler
  // ---------------------------------------------------------------------------

  describe('createErrorHandler — default (no onError)', () => {
    it('calls error reporter for 5xx errors', async () => {
      const { createErrorHandler } = await import('./error-tracking.js');

      const app = new Hono<Env>();
      app.onError(createErrorHandler());
      app.get('/boom', () => {
        throw new Error('kaboom');
      });

      const res = await app.request('/boom');
      expect(res.status).toBe(500);

      // fire-and-forget — allow one tick
      await new Promise((r) => setTimeout(r, 20));

      expect(mockReport).toHaveBeenCalledOnce();
      const [err, ctx] = mockReport.mock.calls[0] as [Error, Record<string, unknown>];
      expect(err.message).toBe('kaboom');
      expect(ctx.statusCode).toBe(500);
      expect(ctx.path).toBe('/boom');
    });

    it('does NOT call error reporter for 4xx errors', async () => {
      const { createErrorHandler } = await import('./error-tracking.js');

      const app = new Hono<Env>();
      app.onError(createErrorHandler());
      app.get('/bad', () => {
        const err = Object.assign(new Error('bad input'), { status: 400 });
        throw err;
      });

      const res = await app.request('/bad');
      expect(res.status).toBe(400);

      await new Promise((r) => setTimeout(r, 20));
      expect(mockReport).not.toHaveBeenCalled();
    });
  });

  describe('createErrorHandler — with onError', () => {
    it('calls onError hook and skips default reporter', async () => {
      const { createErrorHandler } = await import('./error-tracking.js');
      const onError = vi.fn();

      const app = new Hono<Env>();
      app.onError(createErrorHandler({ onError }));
      app.get('/boom', () => {
        throw new Error('hook-path');
      });

      await app.request('/boom');
      await new Promise((r) => setTimeout(r, 20));

      expect(onError).toHaveBeenCalledOnce();
      expect(mockReport).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // createErrorTrackingMiddleware
  // ---------------------------------------------------------------------------

  describe('createErrorTrackingMiddleware — default (no onError)', () => {
    it('calls error reporter and re-throws for downstream handler', async () => {
      const { createErrorTrackingMiddleware, createErrorHandler } = await import(
        './error-tracking.js'
      );

      const app = new Hono<Env>();
      app.use('*', createErrorTrackingMiddleware());
      app.onError(createErrorHandler());
      app.get('/throw', () => {
        throw new Error('middleware-path');
      });

      const res = await app.request('/throw');
      expect(res.status).toBe(500);

      await new Promise((r) => setTimeout(r, 20));

      // Reporter called at least once (middleware fires, handler also fires)
      expect(mockReport.mock.calls.length).toBeGreaterThanOrEqual(1);
      const errors = mockReport.mock.calls.map(([e]) => (e as Error).message);
      expect(errors).toContain('middleware-path');
    });
  });

  describe('createErrorTrackingMiddleware — with onError', () => {
    it('calls onError hook instead of default reporter', async () => {
      const { createErrorTrackingMiddleware, createErrorHandler } = await import(
        './error-tracking.js'
      );
      const onError = vi.fn();

      const app = new Hono<Env>();
      app.use('*', createErrorTrackingMiddleware({ onError }));
      app.onError(createErrorHandler({ onError }));
      app.get('/throw', () => {
        throw new Error('hook-only');
      });

      await app.request('/throw');
      await new Promise((r) => setTimeout(r, 20));

      expect(onError.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(mockReport).not.toHaveBeenCalled();
    });
  });
});
