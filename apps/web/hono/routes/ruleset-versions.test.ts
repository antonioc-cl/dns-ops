/**
 * Ruleset Version Routes Tests
 *
 * Tests for listing, fetching, and activating ruleset versions.
 * Uses the mock-DB + app.request() pattern.
 */

import type { IDatabaseAdapter } from '@dns-ops/db';
import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import type { Env } from '../types.js';
import { rulesetVersionRoutes } from './ruleset-versions.js';

// =============================================================================
// MOCK DB HELPERS
// =============================================================================

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

interface MockState {
  rulesetVersions: Array<Record<string, unknown>>;
}

function createMockDb(state: MockState): IDatabaseAdapter {
  return {
    getDrizzle: vi.fn(),
    select: vi.fn(async (table: unknown) => {
      const name = getTableName(table);
      if (name === 'ruleset_versions') return [...state.rulesetVersions];
      return [];
    }),
    selectWhere: vi.fn(async (table: unknown, condition: unknown) => {
      const name = getTableName(table);
      const param = getConditionParam(condition);
      if (name === 'ruleset_versions') {
        return state.rulesetVersions.filter(
          (r) => r.id === param || r.version === param || r.active === param
        );
      }
      return [];
    }),
    selectOne: vi.fn(async (table: unknown, condition: unknown) => {
      const name = getTableName(table);
      const param = getConditionParam(condition);
      if (name === 'ruleset_versions') {
        return state.rulesetVersions.find(
          (r) => r.id === param || r.version === param || r.active === param
        );
      }
      return undefined;
    }),
    insert: vi.fn(async (_table: unknown, values: Record<string, unknown>) => ({
      id: `rv-${Date.now()}`,
      createdAt: new Date(),
      ...values,
    })),
    insertMany: vi.fn(),
    update: vi.fn(async (_table: unknown, values: Record<string, unknown>) => {
      // For setActive, update matching versions
      return [{ ...values }];
    }),
    updateOne: vi.fn(async () => undefined),
    delete: vi.fn(async () => 0),
  } as unknown as IDatabaseAdapter;
}

// =============================================================================
// APP SETUP
// =============================================================================

const SAMPLE_VERSIONS = [
  {
    id: '11111111-1111-1111-8111-111111111111',
    version: '1.0.0',
    description: 'Initial ruleset',
    active: false,
    rules: { dns: 5, mail: 3 },
    createdAt: new Date('2024-01-01'),
  },
  {
    id: '22222222-2222-2222-8222-222222222222',
    version: '1.1.0',
    description: 'Added DKIM rules',
    active: true,
    rules: { dns: 7, mail: 5 },
    createdAt: new Date('2024-02-01'),
  },
  {
    id: '33333333-3333-3333-8333-333333333333',
    version: '1.2.0',
    description: 'DMARC alignment rules',
    active: false,
    rules: { dns: 8, mail: 6 },
    createdAt: new Date('2024-03-01'),
  },
];

function createApp(state: MockState) {
  const db = createMockDb(state);
  const app = new Hono<Env>();

  // Inject auth and DB context
  app.use('*', async (c, next) => {
    c.set('db', db as Env['Variables']['db']);
    c.set('tenantId', 'tenant-1');
    c.set('actorId', 'test-actor');
    c.set('actorEmail', 'test@example.com');
    await next();
  });

  app.route('/api/ruleset-versions', rulesetVersionRoutes);
  return app;
}

// =============================================================================
// TESTS
// =============================================================================

describe('Ruleset Version Routes', () => {
  describe('GET /api/ruleset-versions', () => {
    it('returns paginated list of versions', async () => {
      const app = createApp({ rulesetVersions: SAMPLE_VERSIONS });
      const res = await app.request('/api/ruleset-versions');

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        versions: Array<Record<string, unknown>>;
        pagination: { total: number; limit: number; offset: number; hasMore: boolean };
      };
      expect(body.versions).toBeDefined();
      expect(body.pagination).toBeDefined();
      expect(body.pagination.total).toBe(3);
    });

    it('returns empty list when no versions exist', async () => {
      const app = createApp({ rulesetVersions: [] });
      const res = await app.request('/api/ruleset-versions');

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        versions: Array<Record<string, unknown>>;
        pagination: { total: number };
      };
      expect(body.versions).toHaveLength(0);
      expect(body.pagination.total).toBe(0);
    });

    it('respects limit and offset', async () => {
      const app = createApp({ rulesetVersions: SAMPLE_VERSIONS });
      const res = await app.request('/api/ruleset-versions?limit=1&offset=0');

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        versions: Array<Record<string, unknown>>;
        pagination: { limit: number; offset: number; hasMore: boolean };
      };
      expect(body.versions).toHaveLength(1);
      expect(body.pagination.hasMore).toBe(true);
    });
  });

  describe('GET /api/ruleset-versions/active', () => {
    it('returns active ruleset version', async () => {
      const app = createApp({ rulesetVersions: SAMPLE_VERSIONS });
      const res = await app.request('/api/ruleset-versions/active');

      expect(res.status).toBe(200);
      const body = (await res.json()) as { version: string; active: boolean };
      expect(body.active).toBe(true);
      expect(body.version).toBe('1.1.0');
    });

    it('returns 404 when no active version', async () => {
      const versions = SAMPLE_VERSIONS.map((v) => ({ ...v, active: false }));
      const app = createApp({ rulesetVersions: versions });
      const res = await app.request('/api/ruleset-versions/active');

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/ruleset-versions/latest', () => {
    it('returns most recently created version', async () => {
      const app = createApp({ rulesetVersions: SAMPLE_VERSIONS });
      const res = await app.request('/api/ruleset-versions/latest');

      expect(res.status).toBe(200);
      const body = (await res.json()) as { version: string };
      expect(body.version).toBe('1.2.0');
    });

    it('returns 404 when no versions exist', async () => {
      const app = createApp({ rulesetVersions: [] });
      const res = await app.request('/api/ruleset-versions/latest');

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/ruleset-versions/by-version/:version', () => {
    it('returns version by version string', async () => {
      const app = createApp({ rulesetVersions: SAMPLE_VERSIONS });
      const res = await app.request('/api/ruleset-versions/by-version/1.0.0');

      expect(res.status).toBe(200);
      const body = (await res.json()) as { version: string };
      expect(body.version).toBe('1.0.0');
    });

    it('returns 404 for unknown version string', async () => {
      const app = createApp({ rulesetVersions: SAMPLE_VERSIONS });
      const res = await app.request('/api/ruleset-versions/by-version/99.0.0');

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/ruleset-versions/:id', () => {
    it('returns version by UUID', async () => {
      const app = createApp({ rulesetVersions: SAMPLE_VERSIONS });
      const res = await app.request('/api/ruleset-versions/11111111-1111-1111-8111-111111111111');

      expect(res.status).toBe(200);
      const body = (await res.json()) as { version: string };
      expect(body.version).toBe('1.0.0');
    });

    it('returns 400 for invalid UUID', async () => {
      const app = createApp({ rulesetVersions: SAMPLE_VERSIONS });
      const res = await app.request('/api/ruleset-versions/not-a-uuid');

      expect(res.status).toBe(400);
    });

    it('returns 404 for unknown UUID', async () => {
      const app = createApp({ rulesetVersions: SAMPLE_VERSIONS });
      const res = await app.request('/api/ruleset-versions/99999999-9999-4999-a999-999999999999');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/ruleset-versions/:id/activate', () => {
    it('returns 400 for invalid UUID', async () => {
      const app = createApp({ rulesetVersions: SAMPLE_VERSIONS });
      const res = await app.request('/api/ruleset-versions/bad-id/activate', {
        method: 'POST',
      });

      expect(res.status).toBe(400);
    });

    it('returns 404 for unknown version', async () => {
      const app = createApp({ rulesetVersions: SAMPLE_VERSIONS });
      const res = await app.request(
        '/api/ruleset-versions/99999999-9999-4999-a999-999999999999/activate',
        { method: 'POST' }
      );

      expect(res.status).toBe(404);
    });
  });
});
