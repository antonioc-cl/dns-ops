/**
 * Auth Middleware Scope E2E Tests
 *
 * These tests verify that auth middleware is applied correctly to routes,
 * preventing security issues where:
 * 1. Protected routes are accidentally left open
 * 2. Auth middleware is applied at router level affecting other routes
 * 3. Public routes accidentally require auth
 *
 * Issue history: router.use('*', requireAuth) on routers mounted at '/'
 * was blocking public routes like /api/alerts/reports/shared/:token
 */

import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../types.js';
import { apiRoutes } from './api.js';

// =============================================================================
// Route Classification - Based on actual mounting in api.ts
// =============================================================================

interface RouteDefinition {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  requiresAuth: boolean;
  description: string;
}

// Routes mounted at / (via apiRoutes.route('/', ...))
const PROTECTED_ROOT_ROUTES: RouteDefinition[] = [
  // Selector routes
  {
    path: '/api/snapshot/test/selectors',
    method: 'GET',
    requiresAuth: true,
    description: 'Get DKIM selectors',
  },
  {
    path: '/api/domain/test.com/selectors/suggest',
    method: 'GET',
    requiresAuth: true,
    description: 'Suggest DKIM selectors',
  },

  // Findings routes
  {
    path: '/api/snapshot/test/findings',
    method: 'GET',
    requiresAuth: true,
    description: 'Get findings',
  },
  {
    path: '/api/snapshot/test/findings/mail',
    method: 'GET',
    requiresAuth: true,
    description: 'Get mail findings',
  },
  {
    path: '/api/snapshot/test/findings/summary',
    method: 'GET',
    requiresAuth: true,
    description: 'Get findings summary',
  },
  {
    path: '/api/snapshot/test/evaluate',
    method: 'POST',
    requiresAuth: true,
    description: 'Re-evaluate findings',
  },
  {
    path: '/api/findings/test/acknowledge',
    method: 'PATCH',
    requiresAuth: true,
    description: 'Acknowledge finding',
  },
  {
    path: '/api/findings/test/false-positive',
    method: 'PATCH',
    requiresAuth: true,
    description: 'Mark false positive',
  },
  {
    path: '/api/findings/test',
    method: 'GET',
    requiresAuth: true,
    description: 'Get single finding',
  },
  {
    path: '/api/findings/backfill',
    method: 'POST',
    requiresAuth: true,
    description: 'Backfill findings',
  },
  {
    path: '/api/findings/backfill/status',
    method: 'GET',
    requiresAuth: true,
    description: 'Get backfill status',
  },

  // Delegation routes
  {
    path: '/api/snapshot/test/delegation',
    method: 'GET',
    requiresAuth: true,
    description: 'Get delegation',
  },
  {
    path: '/api/snapshot/test/delegation/issues',
    method: 'GET',
    requiresAuth: true,
    description: 'Get delegation issues',
  },
  {
    path: '/api/snapshot/test/delegation/dnssec',
    method: 'GET',
    requiresAuth: true,
    description: 'Get DNSSEC info',
  },
  {
    path: '/api/snapshot/test/delegation/evidence',
    method: 'GET',
    requiresAuth: true,
    description: 'Get delegation evidence',
  },
  {
    path: '/api/domain/test.com/delegation/latest',
    method: 'GET',
    requiresAuth: true,
    description: 'Get latest delegation',
  },

  // Legacy tools routes (mounted at /)
  { path: '/api/log', method: 'POST', requiresAuth: true, description: 'Log legacy tool access' },
  {
    path: '/api/dmarc/deeplink',
    method: 'GET',
    requiresAuth: true,
    description: 'Get DMARC deeplink',
  },
  {
    path: '/api/dkim/deeplink',
    method: 'GET',
    requiresAuth: true,
    description: 'Get DKIM deeplink',
  },
  {
    path: '/api/bulk-deeplinks',
    method: 'POST',
    requiresAuth: true,
    description: 'Get bulk deeplinks',
  },
  { path: '/api/shadow-stats', method: 'GET', requiresAuth: true, description: 'Get shadow stats' },

  // Mail routes (mounted at /)
  {
    path: '/api/collect/mail',
    method: 'POST',
    requiresAuth: true,
    description: 'Collect mail data',
  },
  {
    path: '/api/remediation',
    method: 'POST',
    requiresAuth: true,
    description: 'Create remediation',
  },
  { path: '/api/remediation', method: 'GET', requiresAuth: true, description: 'List remediations' },
  {
    path: '/api/remediation/stats',
    method: 'GET',
    requiresAuth: true,
    description: 'Get remediation stats',
  },
  {
    path: '/api/remediation/by-id/test',
    method: 'GET',
    requiresAuth: true,
    description: 'Get remediation by ID',
  },
  {
    path: '/api/remediation/domain/test.com',
    method: 'GET',
    requiresAuth: true,
    description: 'Get remediation by domain',
  },
  {
    path: '/api/remediation/test',
    method: 'PATCH',
    requiresAuth: true,
    description: 'Update remediation',
  },
];

// Routes mounted at specific paths
const PROTECTED_PREFIXED_ROUTES: RouteDefinition[] = [
  // Simulation routes (mounted at /simulate)
  { path: '/api/simulate', method: 'POST', requiresAuth: true, description: 'Run DNS simulation' },
  {
    path: '/api/simulate/actionable-types',
    method: 'GET',
    requiresAuth: true,
    description: 'Get actionable finding types',
  },
];

const PUBLIC_ROUTES: RouteDefinition[] = [
  { path: '/api/health', method: 'GET', requiresAuth: false, description: 'Health check' },
  { path: '/api/config', method: 'GET', requiresAuth: false, description: 'Legacy tools config' },
  {
    path: '/api/alerts/reports/shared/test-token',
    method: 'GET',
    requiresAuth: false,
    description: 'Access shared report',
  },
];

const ALL_PROTECTED_ROUTES = [...PROTECTED_ROOT_ROUTES, ...PROTECTED_PREFIXED_ROUTES];

// =============================================================================
// Helper Functions
// =============================================================================

function createMockDb() {
  return {
    select: vi.fn().mockResolvedValue([]),
    selectOne: vi.fn().mockResolvedValue(null),
    selectWhere: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockResolvedValue({ id: 'mock-id' }),
    insertMany: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue({}),
    updateOne: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    deleteOne: vi.fn().mockResolvedValue({}),
    transaction: vi.fn().mockImplementation(async (callback) => callback({})),
    getDrizzle: vi.fn(),
  } as unknown as Env['Variables']['db'];
}

function createUnauthenticatedApp(): Hono<Env> {
  const app = new Hono<Env>();

  // Add mock db WITHOUT auth context (middleware order matters!)
  app.use('*', async (c, next) => {
    c.set('db', createMockDb());
    // NOT setting tenantId or actorId - simulating unauthenticated
    await next();
  });

  // Mount API routes
  app.route('/api', apiRoutes);

  return app;
}

function createAuthenticatedApp(): Hono<Env> {
  const app = new Hono<Env>();

  // Add mock db WITH auth context
  app.use('*', async (c, next) => {
    c.set('db', createMockDb());
    c.set('tenantId', 'test-tenant');
    c.set('actorId', 'test-actor');
    await next();
  });

  // Mount API routes
  app.route('/api', apiRoutes);

  return app;
}

// =============================================================================
// Test Suite
// =============================================================================

describe('Auth Middleware Scope E2E', () => {
  describe('Protected Routes - Unauthenticated Access', () => {
    let app: Hono<Env>;

    beforeEach(() => {
      app = createUnauthenticatedApp();
    });

    for (const route of ALL_PROTECTED_ROUTES) {
      it(`should require auth for ${route.method} ${route.path} (${route.description})`, async () => {
        const response = await app.request(route.path, { method: route.method });

        // Should return 401 Unauthorized
        expect(response.status).toBe(401);

        const body = (await response.json()) as { error: string };
        expect(body.error).toBe('Unauthorized');
      });
    }
  });

  describe('Public Routes - Unauthenticated Access', () => {
    let app: Hono<Env>;

    beforeEach(() => {
      app = createUnauthenticatedApp();
    });

    for (const route of PUBLIC_ROUTES) {
      it(`should NOT require auth for ${route.method} ${route.path} (${route.description})`, async () => {
        const response = await app.request(route.path, { method: route.method });

        // Should NOT return 401 or 403
        // (may be 404 if resource doesn't exist, that's fine)
        expect([401, 403]).not.toContain(response.status);
      });
    }
  });

  describe('Router-level Middleware Scope', () => {
    let app: Hono<Env>;

    beforeEach(() => {
      app = createUnauthenticatedApp();
    });

    it('should not apply auth from one router to routes in another router', async () => {
      // Test that public routes still work even though protected routes require auth
      const publicResponse = await app.request('/api/health', { method: 'GET' });
      expect(publicResponse.status).not.toBe(401);

      // And protected routes still require auth
      const protectedResponse = await app.request('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotId: 'test' }),
      });
      expect(protectedResponse.status).toBe(401);
    });

    it('should not block /api/alerts/reports/shared/:token with selectorRoutes auth', async () => {
      // This was the specific bug: selectorRoutes.use('*', requireAuth) blocked
      // /api/alerts/reports/shared/:token because selectorRoutes is mounted at '/'

      const response = await app.request('/api/alerts/reports/shared/test-token', {
        method: 'GET',
      });

      // Should not be 401 (might be 404 if token doesn't exist)
      expect(response.status).not.toBe(401);
    });

    it('should not block /api/config (public) with selectorRoutes auth', async () => {
      const response = await app.request('/api/config', { method: 'GET' });

      // /api/config is public (no auth required)
      expect(response.status).not.toBe(401);
    });

    it('should not block /api/health with simulationRoutes auth', async () => {
      const response = await app.request('/api/health', { method: 'GET' });

      expect(response.status).not.toBe(401);
    });
  });

  describe('Protected Routes - Authenticated Access', () => {
    let app: Hono<Env>;

    beforeEach(() => {
      app = createAuthenticatedApp();
    });

    for (const route of ALL_PROTECTED_ROUTES) {
      it(`should allow authenticated access to ${route.method} ${route.path}`, async () => {
        const options: RequestInit = { method: route.method };

        // Add body for POST/PATCH requests
        if (route.method === 'POST' || route.method === 'PATCH') {
          options.headers = { 'Content-Type': 'application/json' };
          options.body = JSON.stringify({ test: 'data' });
        }

        const response = await app.request(route.path, options);

        // Should NOT return 401 (may return 404 if resource not found, that's OK)
        expect(response.status).not.toBe(401);
      });
    }
  });
});

// =============================================================================
// Regression Tests for Specific Past Issues
// =============================================================================

describe('Auth Middleware Scope - Regression Tests', () => {
  it('regression: selectorRoutes.use(*, requireAuth) should not be used', async () => {
    // Read the actual source file to verify the fix
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { fileURLToPath } = await import('node:url');

    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const selectorsPath = path.join(__dirname, 'selectors.ts');
    const content = fs.readFileSync(selectorsPath, 'utf-8');

    // Should NOT have router-level middleware
    expect(content).not.toMatch(/selectorRoutes\.use\s*\(\s*['"]\*['"]/);

    // Should have per-route middleware instead
    expect(content).toMatch(/selectorRoutes\.get\s*\([^)]+,\s*requireAuth/);
  });

  it('regression: simulationRoutes.use(*, requireAuth) should not be used', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { fileURLToPath } = await import('node:url');

    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const simulationPath = path.join(__dirname, 'simulation.ts');
    const content = fs.readFileSync(simulationPath, 'utf-8');

    // Should NOT have router-level middleware
    expect(content).not.toMatch(/simulationRoutes\.use\s*\(\s*['"]\*['"]/);

    // Should have per-route middleware instead
    expect(content).toMatch(/simulationRoutes\.(post|get)\s*\([^)]+,\s*requireAuth/);
  });
});
