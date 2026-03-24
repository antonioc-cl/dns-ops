/**
 * Detailed Health Endpoint Tests - PR-10.3
 *
 * Tests for GET /api/health/detailed
 * - Requires admin access
 * - Returns version, uptime, DB status, circuit breaker state
 */

import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../types.js';
import { apiRoutes } from './api.js';

describe('GET /api/health/detailed', () => {
  let app: Hono<Env>;

  beforeEach(() => {
    vi.resetAllMocks();
    app = new Hono<Env>();

    // Setup middleware to inject dependencies
    app.use('*', (c, next) => {
      c.set('db', {
        selectOne: vi.fn(),
        select: vi.fn(),
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
  });

  describe('Admin Access Control', () => {
    it('should require admin access', async () => {
      const res = await app.request('/api/health/detailed');

      // Should be rejected without admin credentials
      expect([401, 403]).toContain(res.status);
    });

    it('should return detailed health with CF-Access header', async () => {
      const res = await app.request('/api/health/detailed', {
        headers: {
          'CF-Access-Authenticated-User-Email': 'admin@example.com',
        },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        status: string;
        service: string;
        version: string;
        uptime: { seconds: number; formatted: string };
        checks: {
          database: { status: string };
          circuitBreaker: { state: string };
        };
      };

      expect(body.status).toBe('healthy');
      expect(body.service).toBe('dns-ops-web');
      expect(body.version).toBe('0.1.0');
      expect(body.uptime.seconds).toBeGreaterThanOrEqual(0);
      expect(body.checks.database.status).toBe('ok');
      expect(['closed', 'open', 'half-open']).toContain(body.checks.circuitBreaker.state);
    });
  });

  describe('Response Structure', () => {
    it('should include version field', async () => {
      const res = await app.request('/api/health/detailed', {
        headers: {
          'CF-Access-Authenticated-User-Email': 'admin@example.com',
        },
      });
      const body = (await res.json()) as { version: string };

      expect(body.version).toBeDefined();
      expect(typeof body.version).toBe('string');
    });

    it('should include uptime with seconds and formatted', async () => {
      const res = await app.request('/api/health/detailed', {
        headers: {
          'CF-Access-Authenticated-User-Email': 'admin@example.com',
        },
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
      const res = await app.request('/api/health/detailed', {
        headers: {
          'CF-Access-Authenticated-User-Email': 'admin@example.com',
        },
      });
      const body = (await res.json()) as {
        checks: { database: { status: string } };
      };

      expect(body.checks.database).toBeDefined();
      expect(body.checks.database.status).toBe('ok');
    });

    it('should include circuit breaker state', async () => {
      const res = await app.request('/api/health/detailed', {
        headers: {
          'CF-Access-Authenticated-User-Email': 'admin@example.com',
        },
      });
      const body = (await res.json()) as {
        checks: { circuitBreaker: { state: string; description: string } };
      };

      expect(body.checks.circuitBreaker).toBeDefined();
      expect(['closed', 'open', 'half-open']).toContain(body.checks.circuitBreaker.state);
      expect(body.checks.circuitBreaker.description).toBeDefined();
    });
  });

  describe('Timestamp', () => {
    it('should include ISO timestamp', async () => {
      const res = await app.request('/api/health/detailed', {
        headers: {
          'CF-Access-Authenticated-User-Email': 'admin@example.com',
        },
      });
      const body = (await res.json()) as { timestamp: string };

      expect(body.timestamp).toBeDefined();
      expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
    });
  });
});
