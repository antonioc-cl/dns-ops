/**
 * Cross-Tenant Read Isolation Tests - PR-09.2
 *
 * Create domain+snapshot+findings as tenant A.
 * Read as tenant B → 404.
 * List findings as tenant B → 404/empty.
 * Public read (no tenant header) can read unowned domains but NOT tenant A's domains.
 *
 * Note: Portfolio routes require authentication (requireAuth middleware).
 * These tests verify cross-tenant isolation within authenticated requests.
 */

import type { IDatabaseAdapter } from '@dns-ops/db';
import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import type { Env } from '../types.js';
import { portfolioRoutes } from './portfolio.js';

interface MockState {
  domains: Array<Record<string, unknown>>;
  snapshots: Array<Record<string, unknown>>;
  findings: Array<Record<string, unknown>>;
  suggestions: Array<Record<string, unknown>>;
  notes: Array<Record<string, unknown>>;
  tags: Array<Record<string, unknown>>;
  filters: Array<Record<string, unknown>>;
}

// Extract table name from Drizzle table object
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

// Extract condition parameter value from SQL condition
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
      if (tableName === 'domains') return [...state.domains];
      if (tableName === 'snapshots') return [...state.snapshots];
      if (tableName === 'findings') return [...state.findings];
      if (tableName === 'suggestions') return [...state.suggestions];
      if (tableName === 'notes') return [...state.notes];
      if (tableName === 'tags') return [...state.tags];
      if (tableName === 'filters') return [...state.filters];
      return [];
    }),
    selectOne: vi.fn(async (table: unknown, condition: unknown) => {
      const tableName = getTableName(table);
      const condVal = getConditionParam(condition);
      if (tableName === 'domains') return state.domains.find((d) => d.id === condVal) || null;
      if (tableName === 'snapshots') return state.snapshots.find((s) => s.id === condVal) || null;
      if (tableName === 'findings') return state.findings.find((f) => f.id === condVal) || null;
      return null;
    }),
    selectWhere: vi.fn(async (table: unknown, condition: unknown) => {
      const tableName = getTableName(table);
      const condVal = getConditionParam(condition);
      if (tableName === 'snapshots') {
        return state.snapshots.filter((s) => s.domainId === condVal || s.tenantId === condVal);
      }
      if (tableName === 'findings') {
        return state.findings.filter((f) => f.tenantId === condVal);
      }
      if (tableName === 'suggestions') {
        return state.suggestions.filter((s) => s.tenantId === condVal);
      }
      if (tableName === 'notes') {
        return state.notes.filter((n) => n.tenantId === condVal);
      }
      if (tableName === 'tags') {
        return state.tags.filter((t) => t.tenantId === condVal);
      }
      if (tableName === 'filters') {
        return state.filters.filter((f) => f.tenantId === condVal);
      }
      return [];
    }),
    insert: vi.fn(),
    insertMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } as unknown as IDatabaseAdapter;
}

// Helper to create app with specific tenant context (always authenticated)
function createAppWithTenant(state: MockState, tenantId: string) {
  const app = new Hono<Env>();
  const mockDb = createMockDb(state);
  app.use('*', async (c, next) => {
    c.set('db', mockDb);
    c.set('tenantId', tenantId);
    c.set('actorId', 'test-actor');
    await next();
  });
  app.route('/api/portfolio', portfolioRoutes);
  return app;
}

const DOMAIN_ID = 'dom-tenant-a';
const SNAPSHOT_ID = 'snap-tenant-a';
const FINDING_ID = 'finding-tenant-a';
const NOTE_ID = 'note-tenant-a';
const TAG_ID = 'tag-tenant-a';
const FILTER_ID = 'filter-tenant-a';
const TENANT_A = 'tenant-a';
const TENANT_B = 'tenant-b';

describe('PR-09.2: Cross-Tenant Read Isolation', () => {
  describe('Domain read isolation', () => {
    it('should return 404 when tenant B reads tenant A domain', async () => {
      const state: MockState = {
        domains: [
          {
            id: DOMAIN_ID,
            name: 'example.com',
            normalizedName: 'example.com',
            tenantId: TENANT_A,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        snapshots: [],
        findings: [],
        suggestions: [],
        notes: [],
        tags: [],
        filters: [],
      };

      const app = createAppWithTenant(state, TENANT_B);

      const response = await app.request(`/api/portfolio/domains/${DOMAIN_ID}`);

      expect(response.status).toBe(404);
      const json = (await response.json()) as { error: string };
      expect(json.error).toBe('Domain not found');
    });

    it('should succeed when tenant A reads their own domain', async () => {
      const state: MockState = {
        domains: [
          {
            id: DOMAIN_ID,
            name: 'example.com',
            normalizedName: 'example.com',
            tenantId: TENANT_A,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        snapshots: [],
        findings: [],
        suggestions: [],
        notes: [],
        tags: [],
        filters: [],
      };

      const app = createAppWithTenant(state, TENANT_A);

      const response = await app.request(`/api/portfolio/domains/${DOMAIN_ID}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Findings read isolation', () => {
    it('should return empty list when tenant B lists findings', async () => {
      const state: MockState = {
        domains: [],
        snapshots: [],
        findings: [
          {
            id: FINDING_ID,
            snapshotId: SNAPSHOT_ID,
            domainId: DOMAIN_ID,
            type: 'mail.no-spf-record',
            title: 'No SPF record',
            severity: 'high',
            confidence: 'certain',
            tenantId: TENANT_A,
            createdAt: new Date(),
          },
        ],
        suggestions: [],
        notes: [],
        tags: [],
        filters: [],
      };

      const app = createAppWithTenant(state, TENANT_B);

      const response = await app.request('/api/portfolio/findings');

      expect(response.status).toBe(200);
      const json = (await response.json()) as { findings: unknown[] };
      // Tenant B should see no findings (empty list)
      expect(json.findings).toHaveLength(0);
    });

    it('should succeed when tenant A lists their findings', async () => {
      const state: MockState = {
        domains: [],
        snapshots: [],
        findings: [
          {
            id: FINDING_ID,
            snapshotId: SNAPSHOT_ID,
            domainId: DOMAIN_ID,
            type: 'mail.no-spf-record',
            title: 'No SPF record',
            severity: 'high',
            confidence: 'certain',
            tenantId: TENANT_A,
            createdAt: new Date(),
          },
        ],
        suggestions: [],
        notes: [],
        tags: [],
        filters: [],
      };

      const app = createAppWithTenant(state, TENANT_A);

      const response = await app.request('/api/portfolio/findings');

      expect(response.status).toBe(200);
      const json = (await response.json()) as { findings: unknown[] };
      expect(json.findings).toHaveLength(1);
    });
  });

  describe('Notes read isolation', () => {
    it('should return empty list when tenant B lists notes', async () => {
      const state: MockState = {
        domains: [],
        snapshots: [],
        findings: [],
        suggestions: [],
        notes: [
          {
            id: NOTE_ID,
            domainId: DOMAIN_ID,
            tenantId: TENANT_A,
            content: 'Tenant A note',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        tags: [],
        filters: [],
      };

      const app = createAppWithTenant(state, TENANT_B);

      const response = await app.request(`/api/portfolio/domains/${DOMAIN_ID}/notes`);

      expect(response.status).toBe(200);
      const json = (await response.json()) as { notes: unknown[] };
      // Tenant B should see no notes (empty list)
      expect(json.notes).toHaveLength(0);
    });
  });

  describe('Tags read isolation', () => {
    it('should return empty list when tenant B lists tags', async () => {
      const state: MockState = {
        domains: [],
        snapshots: [],
        findings: [],
        suggestions: [],
        notes: [],
        tags: [
          {
            id: TAG_ID,
            domainId: DOMAIN_ID,
            tenantId: TENANT_A,
            tag: 'production',
            createdAt: new Date(),
          },
        ],
        filters: [],
      };

      const app = createAppWithTenant(state, TENANT_B);

      const response = await app.request(`/api/portfolio/domains/${DOMAIN_ID}/tags`);

      expect(response.status).toBe(200);
      const json = (await response.json()) as { tags: unknown[] };
      // Tenant B should see no tags (empty list)
      expect(json.tags).toHaveLength(0);
    });
  });

  describe('Filters read isolation', () => {
    it('should return empty list when tenant B lists saved filters', async () => {
      const state: MockState = {
        domains: [],
        snapshots: [],
        findings: [],
        suggestions: [],
        notes: [],
        tags: [],
        filters: [
          {
            id: FILTER_ID,
            tenantId: TENANT_A,
            name: 'Tenant A filter',
            criteria: {},
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      const app = createAppWithTenant(state, TENANT_B);

      const response = await app.request('/api/portfolio/filters');

      expect(response.status).toBe(200);
      const json = (await response.json()) as { filters: unknown[] };
      // Tenant B should see no filters (empty list)
      expect(json.filters).toHaveLength(0);
    });

    it('should succeed when tenant A lists their filters', async () => {
      const state: MockState = {
        domains: [],
        snapshots: [],
        findings: [],
        suggestions: [],
        notes: [],
        tags: [],
        filters: [
          {
            id: FILTER_ID,
            tenantId: TENANT_A,
            name: 'Tenant A filter',
            criteria: {},
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      const app = createAppWithTenant(state, TENANT_A);

      const response = await app.request('/api/portfolio/filters');

      expect(response.status).toBe(200);
      const json = (await response.json()) as { filters: unknown[] };
      expect(json.filters).toHaveLength(1);
    });
  });
});
