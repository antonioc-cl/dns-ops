/**
 * Detailed Health Endpoint Tests - PR-10.3
 *
 * Tests for GET /api/health/detailed
 * - Requires admin access
 * - Returns version, uptime, DB status, circuit breaker state
 */

import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../types.js';
import { apiRoutes } from './api.js';

describe('GET /api/health/detailed', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    // Reset env
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Admin Access Control', () => {
    it('should require admin access', async () => {
      const app = new Hono<Env>();
      app.use('*', (c, next) => {
        c.set('db', { select: vi.fn().mockReturnValue([]) } as unknown as Env['Variables']['db']);
        c.set('tenantId', 'test-tenant');
        c.set('actorId', 'test-user');
        return next();
      });
      app.route('/api', apiRoutes);

      const res = await app.request('/api/health/detailed');

      // Should be rejected without admin credentials
      expect([401, 403]).toContain(res.status);
    });

    it('should return detailed health with internal secret', async () => {
      process.env.INTERNAL_SECRET = 'test-secret-123';

      const app = new Hono<Env>();
      app.use('*', (c, next) => {
        c.set('db', {
          selectOne: vi.fn(),
          select: vi.fn().mockReturnValue([]),
          selectWhere: vi.fn(),
          insert: vi.fn(),
          insertMany: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
        } as unknown as Env['Variables']['db']);
        c.set('tenantId', 'test-tenant');
        c.set('actorId', 'test-user');
        return next();
      });
      app.route('/api', apiRoutes);

      const res = await app.request('/api/health/detailed', {
        headers: {
          'X-Internal-Secret': 'test-secret-123',
        },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        status: string;
        service: string;
        version: string;
        uptime: { seconds: number; formatted: string };
        timestamp: string;
        checks: {
          database: { status: string };
          circuitBreaker: { state: string; description: string };
        };
      };

      expect(body.status).toBe('healthy');
      expect(body.service).toBe('dns-ops-web');
      expect(body.version).toBeDefined();
      expect(body.uptime.seconds).toBeGreaterThanOrEqual(0);
      expect(body.timestamp).toBeDefined();
      expect(body.checks.database.status).toBe('connected');
      expect(['closed', 'open', 'half-open']).toContain(body.checks.circuitBreaker.state);
      expect(typeof body.checks.circuitBreaker.consecutiveFailures).toBe('number');
    });
  });

  describe('Response Structure', () => {
    it('should include version field', async () => {
      process.env.INTERNAL_SECRET = 'test-secret-123';

      const app = new Hono<Env>();
      app.use('*', (c, next) => {
        c.set('db', { select: vi.fn().mockReturnValue([]) } as unknown as Env['Variables']['db']);
        c.set('tenantId', 'test-tenant');
        c.set('actorId', 'test-user');
        return next();
      });
      app.route('/api', apiRoutes);

      const res = await app.request('/api/health/detailed', {
        headers: { 'X-Internal-Secret': 'test-secret-123' },
      });
      const body = (await res.json()) as { version: string };

      expect(body.version).toBeDefined();
      expect(typeof body.version).toBe('string');
    });

    it('should include uptime with seconds and formatted', async () => {
      process.env.INTERNAL_SECRET = 'test-secret-123';

      const app = new Hono<Env>();
      app.use('*', (c, next) => {
        c.set('db', { select: vi.fn().mockReturnValue([]) } as unknown as Env['Variables']['db']);
        c.set('tenantId', 'test-tenant');
        c.set('actorId', 'test-user');
        return next();
      });
      app.route('/api', apiRoutes);

      const res = await app.request('/api/health/detailed', {
        headers: { 'X-Internal-Secret': 'test-secret-123' },
      });
      const body = (await res.json()) as {
        uptime: { seconds: number; formatted: string };
      };

      expect(body.uptime).toBeDefined();
      expect(typeof body.uptime.seconds).toBe('number');
      expect(typeof body.uptime.formatted).toBe('string');
      expect(body.uptime.seconds).toBeGreaterThanOrEqual(0);
    });

    it('should include database check', async () => {
      process.env.INTERNAL_SECRET = 'test-secret-123';

      const app = new Hono<Env>();
      app.use('*', (c, next) => {
        c.set('db', { select: vi.fn().mockReturnValue([]) } as unknown as Env['Variables']['db']);
        c.set('tenantId', 'test-tenant');
        c.set('actorId', 'test-user');
        return next();
      });
      app.route('/api', apiRoutes);

      const res = await app.request('/api/health/detailed', {
        headers: { 'X-Internal-Secret': 'test-secret-123' },
      });
      const body = (await res.json()) as {
        checks: { database: { status: string; latencyMs: number | null } };
      };

      expect(body.checks.database).toBeDefined();
      expect(body.checks.database.status).toBe('connected');
    });

    it('should include circuit breaker state', async () => {
      process.env.INTERNAL_SECRET = 'test-secret-123';

      const app = new Hono<Env>();
      app.use('*', (c, next) => {
        c.set('db', { select: vi.fn().mockReturnValue([]) } as unknown as Env['Variables']['db']);
        c.set('tenantId', 'test-tenant');
        c.set('actorId', 'test-user');
        return next();
      });
      app.route('/api', apiRoutes);

      const res = await app.request('/api/health/detailed', {
        headers: { 'X-Internal-Secret': 'test-secret-123' },
      });
      const body = (await res.json()) as {
        checks: { circuitBreaker: { state: string; consecutiveFailures: number } };
      };

      expect(body.checks.circuitBreaker).toBeDefined();
      expect(['closed', 'open', 'half-open']).toContain(body.checks.circuitBreaker.state);
      expect(typeof body.checks.circuitBreaker.consecutiveFailures).toBe('number');
    });
  });

  describe('Timestamp', () => {
    it('should include ISO timestamp', async () => {
      process.env.INTERNAL_SECRET = 'test-secret-123';

      const app = new Hono<Env>();
      app.use('*', (c, next) => {
        c.set('db', { select: vi.fn().mockReturnValue([]) } as unknown as Env['Variables']['db']);
        c.set('tenantId', 'test-tenant');
        c.set('actorId', 'test-user');
        return next();
      });
      app.route('/api', apiRoutes);

      const res = await app.request('/api/health/detailed', {
        headers: { 'X-Internal-Secret': 'test-secret-123' },
      });
      const body = (await res.json()) as { timestamp: string };

      expect(body.timestamp).toBeDefined();
      expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
    });
  });
});
