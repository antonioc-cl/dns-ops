/**
 * Rate Limiting Middleware Tests
 *
 * Tests for token-bucket rate limiter.
 */

import { Hono } from 'hono';
import { beforeEach, describe, expect, it } from 'vitest';
import { getRateLimitStatus, rateLimitMiddleware, resetRateLimit } from './rate-limit.js';

describe('Rate Limiting Middleware', () => {
  beforeEach(() => {
    resetRateLimit();
  });

  describe('Token bucket algorithm', () => {
    it('should allow requests under the limit', async () => {
      const app = new Hono();
      // Add mock tenant context
      app.use('*', async (c, next) => {
        c.set('tenantId', 'test-tenant');
        await next();
      });
      app.use('/api/collect/*', rateLimitMiddleware('collect'));
      app.post('/api/collect/domain', (c) => c.json({ success: true }));

      // First request should succeed
      const res = await app.request('/api/collect/domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(res.headers.get('X-RateLimit-Remaining')).toBe('9');
    });

    it('should allow multiple requests up to the limit', async () => {
      const app = new Hono();
      app.use('*', async (c, next) => {
        c.set('tenantId', 'test-tenant');
        await next();
      });
      app.use('/api/collect/*', rateLimitMiddleware('collect'));
      app.post('/api/collect/domain', (c) => c.json({ success: true }));

      // Make 10 requests (the limit)
      for (let i = 0; i < 10; i++) {
        const res = await app.request('/api/collect/domain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        expect(res.status).toBe(200);
      }

      // 11th request should be rate limited
      const res = await app.request('/api/collect/domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      expect(res.status).toBe(429);
      expect(res.headers.get('Retry-After')).toBeTruthy();
    });

    it('should return 429 with correct error body', async () => {
      const app = new Hono();
      app.use('*', async (c, next) => {
        c.set('tenantId', 'test-tenant');
        await next();
      });
      app.use('/api/collect/*', rateLimitMiddleware('collect'));
      app.post('/api/collect/domain', (c) => c.json({ success: true }));

      // Exhaust the limit
      for (let i = 0; i < 10; i++) {
        await app.request('/api/collect/domain', { method: 'POST' });
      }

      const res = await app.request('/api/collect/domain', { method: 'POST' });

      expect(res.status).toBe(429);
      const body = await res.json();
      expect(body.code).toBe('RATE_LIMITED');
      expect(body.error).toBe('Too Many Requests');
      expect(body.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('Scope-based limits', () => {
    it('should apply stricter limits to probes vs collect', async () => {
      const app = new Hono();
      app.use('*', async (c, next) => {
        c.set('tenantId', 'test-tenant');
        await next();
      });
      app.use('/api/collect/*', rateLimitMiddleware('collect'));
      app.use('/api/probe/*', rateLimitMiddleware('probes'));
      app.post('/api/collect/domain', (c) => c.json({ success: true }));
      app.post('/api/probe/starttls', (c) => c.json({ success: true }));

      // Collect has 10 req/min limit
      for (let i = 0; i < 5; i++) {
        const res = await app.request('/api/collect/domain', { method: 'POST' });
        expect(res.status).toBe(200);
        expect(res.headers.get('X-RateLimit-Limit')).toBe('10');
      }

      // Probes have 5 req/min limit
      for (let i = 0; i < 5; i++) {
        const res = await app.request('/api/probe/starttls', { method: 'POST' });
        expect(res.status).toBe(200);
        expect(res.headers.get('X-RateLimit-Limit')).toBe('5');
      }

      // 6th probe request should be rate limited (5 is the limit)
      const probeRes = await app.request('/api/probe/starttls', { method: 'POST' });
      expect(probeRes.status).toBe(429);
    });
  });

  describe('Per-tenant isolation', () => {
    it('should track rate limits per tenant', async () => {
      const tenantA = new Hono();
      tenantA.use('*', async (c, next) => {
        c.set('tenantId', 'tenant-a');
        await next();
      });
      tenantA.use('/api/collect/*', rateLimitMiddleware('collect'));
      tenantA.post('/api/collect/domain', (c) => c.json({ success: true }));

      const tenantB = new Hono();
      tenantB.use('*', async (c, next) => {
        c.set('tenantId', 'tenant-b');
        await next();
      });
      tenantB.use('/api/collect/*', rateLimitMiddleware('collect'));
      tenantB.post('/api/collect/domain', (c) => c.json({ success: true }));

      // Exhaust limit for tenant-a
      for (let i = 0; i < 10; i++) {
        await tenantA.request('/api/collect/domain', { method: 'POST' });
      }

      // tenant-a should be rate limited
      const tenantARes = await tenantA.request('/api/collect/domain', { method: 'POST' });
      expect(tenantARes.status).toBe(429);

      // tenant-b should still be able to make requests
      const tenantBRes = await tenantB.request('/api/collect/domain', { method: 'POST' });
      expect(tenantBRes.status).toBe(200);
    });
  });

  describe('Reset functionality', () => {
    it('should reset rate limit for specific tenant', async () => {
      const app = new Hono();
      app.use('*', async (c, next) => {
        c.set('tenantId', 'tenant-x');
        await next();
      });
      app.use('/api/collect/*', rateLimitMiddleware('collect'));
      app.post('/api/collect/domain', (c) => c.json({ success: true }));

      // Exhaust limit
      for (let i = 0; i < 10; i++) {
        await app.request('/api/collect/domain', { method: 'POST' });
      }

      // Should be rate limited
      const before = await app.request('/api/collect/domain', { method: 'POST' });
      expect(before.status).toBe(429);

      // Reset
      resetRateLimit('tenant-x', '/api/collect/domain');

      // Should be able to make requests again
      const after = await app.request('/api/collect/domain', { method: 'POST' });
      expect(after.status).toBe(200);
    });
  });

  describe('Status check', () => {
    it('should return status for tracked tenant', async () => {
      // After a request is tracked, status should be available
      const app = new Hono();
      app.use('*', async (c, next) => {
        c.set('tenantId', 'tenant-test');
        await next();
      });
      app.use('/api/collect/*', rateLimitMiddleware('collect'));
      app.post('/api/collect/domain', (c) => c.json({ success: true }));

      // Make a request to trigger tracking
      await app.request('/api/collect/domain', { method: 'POST' });

      // Status should be available
      const status = getRateLimitStatus('tenant-test', '/api/collect/domain');
      expect(status).not.toBeNull();
      expect(status?.limit).toBe(10);
      expect(status?.remaining).toBe(9);
    });
  });

  describe('Unlimited paths', () => {
    it('should not rate limit paths without matching config', async () => {
      const app = new Hono();
      app.use('*', async (c, next) => {
        c.set('tenantId', 'test-tenant');
        await next();
      });
      app.use('/api/*', rateLimitMiddleware('collect'));
      app.get('/api/health', (c) => c.json({ ok: true }));

      const res = await app.request('/api/health', { method: 'GET' });
      // Health check doesn't match collect or probe paths
      expect(res.status).toBe(200);
      // Should not have rate limit headers
      expect(res.headers.get('X-RateLimit-Limit')).toBeNull();
    });
  });
});
