/**
 * Template Override Admin Isolation Tests
 *
 * AUTH-004: Template override create/update/delete should use requireAdminAccess
 * instead of requireWritePermission. Template management is classified as admin/internal.
 *
 * Tests:
 * 1. Write-permission user creating override → 403
 * 2. Admin user creating override → 201
 * 3. Write-permission user updating override → 403
 * 4. Admin user updating override → 200
 * 5. Write-permission user deleting override → 403
 * 6. Admin user deleting override → 200
 */

import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../types.js';
import { portfolioRoutes } from './portfolio.js';

// Helper to create mock DB
function createMockDb() {
  const templateOverrides: Array<Record<string, unknown>> = [];
  const auditEvents: Array<Record<string, unknown>> = [];

  return {
    type: 'postgres' as const,
    db: undefined,
    getDrizzle: () => undefined,
    select: async () => [],
    selectWhere: async (table: unknown) => {
      const tableName = getTableName(table);
      if (tableName === 'template_overrides') return [...templateOverrides];
      if (tableName === 'audit_events') return [...auditEvents];
      return [];
    },
    selectOne: async (table: unknown, condition: unknown) => {
      const tableName = getTableName(table);
      const param = getConditionParam(condition);
      if (tableName === 'template_overrides') {
        return templateOverrides.find((r) => r.id === param);
      }
      return undefined;
    },
    insert: async (_table: unknown, values: Record<string, unknown>) => {
      const row = {
        id: `mock-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...values,
      };
      templateOverrides.push(row);
      return row;
    },
    insertMany: async () => [],
    update: async () => [],
    updateOne: async (table: unknown, values: Record<string, unknown>, condition: unknown) => {
      const tableName = getTableName(table);
      const param = getConditionParam(condition);
      if (tableName === 'template_overrides') {
        const idx = templateOverrides.findIndex((r) => r.id === param);
        if (idx >= 0) {
          templateOverrides[idx] = { ...templateOverrides[idx], ...values };
          return templateOverrides[idx];
        }
      }
      return undefined;
    },
    delete: async () => 0,
    deleteOne: async (table: unknown, condition: unknown) => {
      const tableName = getTableName(table);
      const param = getConditionParam(condition);
      if (tableName === 'template_overrides') {
        const idx = templateOverrides.findIndex((r) => r.id === param);
        if (idx >= 0) {
          templateOverrides.splice(idx, 1);
          return true;
        }
      }
      return false;
    },
    transaction: async <T>(callback: (adapter: unknown) => Promise<T>) => callback(createMockDb()),
  };
}

function getTableName(table: unknown): string {
  if (!table || typeof table !== 'object') return '';
  const record = table as Record<symbol | string, unknown>;
  const symbolName = Symbol.for('drizzle:Name');
  if (typeof record[symbolName] === 'string') {
    return record[symbolName] as string;
  }
  const symbols = Object.getOwnPropertySymbols(record);
  const drizzleName = symbols.find((s) => String(s) === 'Symbol(drizzle:Name)');
  if (drizzleName && typeof record[drizzleName] === 'string') {
    return record[drizzleName] as string;
  }
  return '';
}

function getConditionParam(condition: unknown): unknown {
  const sql = condition as {
    queryChunks?: Array<{ constructor?: { name?: string }; value?: unknown }>;
  };
  return sql.queryChunks?.find((c) => c?.constructor?.name === 'Param')?.value;
}

describe('Template Override Admin Isolation (AUTH-004)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, NODE_ENV: 'test' };
  });

  // Helper to create app with write-permission user (no admin access)
  function createWriteUserApp() {
    const app = new Hono<Env>();
    app.use('/portfolio/*', async (c, next) => {
      c.set('tenantId', 'tenant-123');
      c.set('actorId', 'write-user');
      // Note: NOT setting actorEmail - requireAdminAccess checks (cfEmail || actorEmail)
      c.set('db', createMockDb() as unknown as Env['Variables']['db']);
      await next();
    });
    app.route('/portfolio', portfolioRoutes);
    return app;
  }

  // Helper to create app with admin user (has admin access via X-Internal-Secret)
  function createAdminApp(mockDb?: ReturnType<typeof createMockDb>) {
    const app = new Hono<Env>();
    app.use('/portfolio/*', async (c, next) => {
      c.set('tenantId', 'tenant-123');
      c.set('actorId', 'admin-user');
      c.set('actorEmail', 'admin@example.com');
      c.set('db', (mockDb ?? createMockDb()) as unknown as Env['Variables']['db']);
      await next();
    });
    app.route('/portfolio', portfolioRoutes);
    return app;
  }

  describe('POST /portfolio/templates/overrides - Create override', () => {
    it('should reject write-permission user with 403', async () => {
      process.env.INTERNAL_SECRET = 'test-internal-secret';
      const app = createWriteUserApp();

      const res = await app.request('/portfolio/templates/overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerKey: 'route53',
          templateKey: 'a-record',
          overrideData: { ttl: 300 },
        }),
      });

      expect(res.status).toBe(403);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.error).toBe('Forbidden');
    });

    it('should allow admin user with 201', async () => {
      process.env.INTERNAL_SECRET = 'test-internal-secret';
      const app = createAdminApp();

      const res = await app.request('/portfolio/templates/overrides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': 'test-internal-secret',
        },
        body: JSON.stringify({
          providerKey: 'route53',
          templateKey: 'a-record',
          overrideData: { ttl: 300 },
        }),
      });

      expect(res.status).toBe(201);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.override).toBeDefined();
    });
  });

  describe('PUT /portfolio/templates/overrides/:overrideId - Update override', () => {
    it('should reject write-permission user with 403', async () => {
      process.env.INTERNAL_SECRET = 'test-internal-secret';
      const app = createWriteUserApp();

      const res = await app.request('/portfolio/templates/overrides/override-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overrideData: { ttl: 600 },
        }),
      });

      expect(res.status).toBe(403);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.error).toBe('Forbidden');
    });

    it('should allow admin user with 200', async () => {
      process.env.INTERNAL_SECRET = 'test-internal-secret';
      const mockDb = createMockDb();
      const app = createAdminApp(mockDb);

      // First create an override
      const createRes = await app.request('/portfolio/templates/overrides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': 'test-internal-secret',
        },
        body: JSON.stringify({
          providerKey: 'route53',
          templateKey: 'a-record',
          overrideData: { ttl: 300 },
        }),
      });
      const createBody = (await createRes.json()) as Record<string, unknown>;
      const overrideId = (createBody.override as Record<string, string>)?.id;

      const res = await app.request(`/portfolio/templates/overrides/${overrideId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': 'test-internal-secret',
        },
        body: JSON.stringify({
          overrideData: { ttl: 600 },
        }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.override).toBeDefined();
    });
  });

  describe('DELETE /portfolio/templates/overrides/:overrideId - Delete override', () => {
    it('should reject write-permission user with 403', async () => {
      process.env.INTERNAL_SECRET = 'test-internal-secret';
      const app = createWriteUserApp();

      const res = await app.request('/portfolio/templates/overrides/override-123', {
        method: 'DELETE',
      });

      expect(res.status).toBe(403);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.error).toBe('Forbidden');
    });

    it('should allow admin user with 200', async () => {
      process.env.INTERNAL_SECRET = 'test-internal-secret';
      const mockDb = createMockDb();
      const app = createAdminApp(mockDb);

      // First create an override
      const createRes = await app.request('/portfolio/templates/overrides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': 'test-internal-secret',
        },
        body: JSON.stringify({
          providerKey: 'route53',
          templateKey: 'a-record',
          overrideData: { ttl: 300 },
        }),
      });
      const createBody = (await createRes.json()) as Record<string, unknown>;
      const overrideId = (createBody.override as Record<string, string>)?.id;

      const res = await app.request(`/portfolio/templates/overrides/${overrideId}`, {
        method: 'DELETE',
        headers: { 'X-Internal-Secret': 'test-internal-secret' },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.success).toBe(true);
    });
  });
});
