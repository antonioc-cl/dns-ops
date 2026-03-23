/**
 * Legacy tools route runtime tests
 */

import type { IDatabaseAdapter } from '@dns-ops/db';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../types.js';
import { legacyToolsRoutes } from './legacy-tools.js';

interface MockState {
  legacyAccessLogs: Array<Record<string, unknown>>;
  shadowComparisons: Array<Record<string, unknown>>;
  snapshots: Array<Record<string, unknown>>;
  findings: Array<Record<string, unknown>>;
}

function getTableName(table: unknown): string {
  if (!table || typeof table !== 'object') return '';
  const record = table as Record<symbol | string, unknown>;
  const symbolName = Symbol.for('drizzle:Name');
  if (typeof record[symbolName] === 'string') {
    return record[symbolName] as string;
  }
  const symbols = Object.getOwnPropertySymbols(record);
  const drizzleName = symbols.find((symbol) => String(symbol) === 'Symbol(drizzle:Name)');
  if (drizzleName && typeof record[drizzleName] === 'string') {
    return record[drizzleName] as string;
  }
  return '';
}

function getConditionParam(condition: unknown): unknown {
  const sql = condition as {
    queryChunks?: Array<{ constructor?: { name?: string }; value?: unknown }>;
  };
  return sql.queryChunks?.find((chunk) => chunk?.constructor?.name === 'Param')?.value;
}

function createMockDb(state: MockState): IDatabaseAdapter {
  return {
    getDrizzle: vi.fn(),
    select: vi.fn(async (table: unknown) => {
      const tableName = getTableName(table);
      if (tableName === 'legacy_access_logs') return [...state.legacyAccessLogs];
      if (tableName === 'shadow_comparisons') return [...state.shadowComparisons];
      if (tableName === 'snapshots') return [...state.snapshots];
      if (tableName === 'findings') return [...state.findings];
      return [];
    }),
    selectWhere: vi.fn(async (table: unknown, condition: unknown) => {
      const tableName = getTableName(table);
      const param = getConditionParam(condition);
      if (tableName === 'legacy_access_logs')
        return state.legacyAccessLogs.filter((row) => row.domain === param);
      if (tableName === 'shadow_comparisons')
        return state.shadowComparisons.filter((row) => row.domain === param);
      if (tableName === 'snapshots')
        return state.snapshots.filter((row) => row.domainName === param);
      if (tableName === 'findings') return state.findings.filter((row) => row.snapshotId === param);
      return [];
    }),
    selectOne: vi.fn(),
    insert: vi.fn(async (_table: unknown, values: Record<string, unknown>) => ({
      id: `log-${Date.now()}`,
      createdAt: new Date(),
      ...values,
    })),
    insertMany: vi.fn(),
    update: vi.fn(),
    updateOne: vi.fn(),
    delete: vi.fn(),
    deleteOne: vi.fn(),
    transaction: vi.fn(async (callback: (db: IDatabaseAdapter) => Promise<unknown>) =>
      callback(createMockDb(state))
    ),
  } as unknown as IDatabaseAdapter;
}

function createApp(state: MockState, auth = true) {
  const app = new Hono<Env>();
  app.use('*', async (c, next) => {
    c.set('db', createMockDb(state));
    if (auth) {
      c.set('tenantId', 'tenant-1');
      c.set('actorId', 'actor-1');
    }
    await next();
  });
  app.route('/api/legacy-tools', legacyToolsRoutes);
  return app;
}

const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  savedEnv.VITE_DMARC_TOOL_URL = process.env.VITE_DMARC_TOOL_URL;
  savedEnv.VITE_DKIM_TOOL_URL = process.env.VITE_DKIM_TOOL_URL;
  process.env.VITE_DMARC_TOOL_URL = 'https://dmarc.example.com/check';
  process.env.VITE_DKIM_TOOL_URL = 'https://dkim.example.com/lookup';
});

afterEach(() => {
  process.env.VITE_DMARC_TOOL_URL = savedEnv.VITE_DMARC_TOOL_URL;
  process.env.VITE_DKIM_TOOL_URL = savedEnv.VITE_DKIM_TOOL_URL;
});

const emptyState: MockState = {
  legacyAccessLogs: [],
  shadowComparisons: [],
  snapshots: [],
  findings: [],
};

describe('legacyToolsRoutes runtime', () => {
  describe('GET /config', () => {
    it('returns tool availability based on env vars', async () => {
      const app = createApp(emptyState);

      const response = await app.request('/api/legacy-tools/config');

      expect(response.status).toBe(200);
      const json = (await response.json()) as {
        dmarc: { available: boolean; disclaimer: string };
        dkim: { available: boolean };
      };
      expect(json.dmarc.available).toBe(true);
      expect(json.dkim.available).toBe(true);
      expect(json.dmarc.disclaimer).toContain('informational');
    });

    it('reports unavailable when env vars unset', async () => {
      process.env.VITE_DMARC_TOOL_URL = '';
      process.env.VITE_DKIM_TOOL_URL = '';
      const app = createApp(emptyState);

      const response = await app.request('/api/legacy-tools/config');

      expect(response.status).toBe(200);
      const json = (await response.json()) as {
        dmarc: { available: boolean };
        dkim: { available: boolean };
      };
      expect(json.dmarc.available).toBe(false);
      expect(json.dkim.available).toBe(false);
    });
  });

  describe('GET /dmarc/deeplink', () => {
    it('returns deep-link for valid domain', async () => {
      const app = createApp(emptyState);

      const response = await app.request('/api/legacy-tools/dmarc/deeplink?domain=example.com');

      expect(response.status).toBe(200);
      const json = (await response.json()) as {
        tool: string;
        domain: string;
        url: string;
        legacyWarning: boolean;
      };
      expect(json.tool).toBe('dmarc');
      expect(json.domain).toBe('example.com');
      expect(json.url).toContain('dmarc.example.com');
      expect(json.url).toContain('domain=example.com');
      expect(json.legacyWarning).toBe(true);
    });

    it('returns 400 when domain missing', async () => {
      const app = createApp(emptyState);
      const response = await app.request('/api/legacy-tools/dmarc/deeplink');
      expect(response.status).toBe(400);
    });

    it('returns 400 for invalid domain', async () => {
      const app = createApp(emptyState);
      const response = await app.request('/api/legacy-tools/dmarc/deeplink?domain=not a domain!');
      expect(response.status).toBe(400);
    });

    it('returns 503 when tool not configured', async () => {
      process.env.VITE_DMARC_TOOL_URL = '';
      const app = createApp(emptyState);
      const response = await app.request('/api/legacy-tools/dmarc/deeplink?domain=example.com');
      expect(response.status).toBe(503);
    });
  });

  describe('GET /dkim/deeplink', () => {
    it('returns deep-link for valid domain + selector', async () => {
      const app = createApp(emptyState);

      const response = await app.request(
        '/api/legacy-tools/dkim/deeplink?domain=example.com&selector=google'
      );

      expect(response.status).toBe(200);
      const json = (await response.json()) as {
        tool: string;
        domain: string;
        selector: string;
        url: string;
      };
      expect(json.tool).toBe('dkim');
      expect(json.selector).toBe('google');
      expect(json.url).toContain('selector=google');
    });

    it('returns 400 when selector missing', async () => {
      const app = createApp(emptyState);
      const response = await app.request('/api/legacy-tools/dkim/deeplink?domain=example.com');
      expect(response.status).toBe(400);
    });

    it('returns 400 for invalid selector', async () => {
      const app = createApp(emptyState);
      const response = await app.request(
        '/api/legacy-tools/dkim/deeplink?domain=example.com&selector=bad selector!'
      );
      expect(response.status).toBe(400);
    });
  });

  describe('POST /log', () => {
    it('logs valid legacy tool access', async () => {
      const app = createApp(emptyState);

      const response = await app.request('/api/legacy-tools/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'dmarc', domain: 'example.com', action: 'view' }),
      });

      expect(response.status).toBe(200);
      const json = (await response.json()) as { success: boolean; logged: boolean };
      expect(json.success).toBe(true);
      expect(json.logged).toBe(true);
    });

    it('rejects invalid tool type', async () => {
      const app = createApp(emptyState);

      const response = await app.request('/api/legacy-tools/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'invalid', domain: 'example.com', action: 'view' }),
      });

      expect(response.status).toBe(400);
    });

    it('rejects missing required fields', async () => {
      const app = createApp(emptyState);

      const response = await app.request('/api/legacy-tools/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'dmarc' }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /bulk-deeplinks', () => {
    it('generates multiple deep-links', async () => {
      const app = createApp(emptyState);

      const response = await app.request('/api/legacy-tools/bulk-deeplinks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            { tool: 'dmarc', domain: 'example.com' },
            { tool: 'dkim', domain: 'test.com', selector: 'selector1' },
          ],
        }),
      });

      expect(response.status).toBe(200);
      const json = (await response.json()) as {
        results: Array<{ index: number; url?: string; error?: string }>;
        legacyWarning: boolean;
      };
      expect(json.results).toHaveLength(2);
      expect(json.results[0]?.url).toContain('dmarc.example.com');
      expect(json.results[1]?.url).toContain('dkim.example.com');
      expect(json.legacyWarning).toBe(true);
    });

    it('rejects batch over 50 items', async () => {
      const app = createApp(emptyState);
      const requests = Array.from({ length: 51 }, (_, i) => ({
        tool: 'dmarc',
        domain: `d${i}.com`,
      }));

      const response = await app.request('/api/legacy-tools/bulk-deeplinks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests }),
      });

      expect(response.status).toBe(400);
    });

    it('returns per-item errors for invalid requests', async () => {
      const app = createApp(emptyState);

      const response = await app.request('/api/legacy-tools/bulk-deeplinks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            { tool: 'dmarc', domain: 'not a domain!' },
            { tool: 'dkim', domain: 'example.com' }, // missing selector
          ],
        }),
      });

      expect(response.status).toBe(200);
      const json = (await response.json()) as {
        results: Array<{ error?: string }>;
      };
      expect(json.results[0]?.error).toBe('Invalid domain');
      expect(json.results[1]?.error).toBe('Invalid selector');
    });
  });

  describe('GET /shadow-stats', () => {
    it('returns aggregate shadow comparison stats', async () => {
      const state: MockState = {
        legacyAccessLogs: [
          { id: 'log-1', tool: 'dmarc', domain: 'example.com', action: 'view', success: true },
        ],
        shadowComparisons: [
          {
            id: 'sc-1',
            domain: 'example.com',
            status: 'match',
            comparisons: [],
            comparedAt: new Date(),
          },
        ],
        snapshots: [],
        findings: [],
      };
      const app = createApp(state);

      const response = await app.request('/api/legacy-tools/shadow-stats');

      expect(response.status).toBe(200);
      const json = (await response.json()) as {
        domain: string;
        durable: boolean;
        stats: {
          legacy: { total: number };
          shadow: { total: number };
        };
      };
      expect(json.domain).toBe('all');
      expect(json.durable).toBe(true);
    });
  });
});
