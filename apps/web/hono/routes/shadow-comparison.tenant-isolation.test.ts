/**
 * Shadow Comparison Routes — Tenant Isolation E2E Tests
 *
 * THESE TESTS WOULD HAVE CAUGHT:
 * 1. GET /provider-baselines/:providerKey using c.req.query('tenantId')
 *    → caller could supply any tenantId to see other tenants' overrides
 * 2. GET /legacy-logs returning ALL tenants' logs (no scoping)
 * 3. GET /mismatch-reports/:domain returning ALL tenants' reports (no scoping)
 * 4. GET /stats returning cross-tenant aggregate stats
 * 5. POST /compare accepting snapshots from other tenants
 *
 * TEST STRATEGY: Two-tenant mock DB. Every route is tested with tenant-A
 * data; then the same request is made as tenant-B. If tenant isolation
 * is missing, tenant-B would see tenant-A's data.
 *
 * Run with: bun run test apps/web/hono/routes/shadow-comparison.tenant-isolation.test.ts
 */

import type { IDatabaseAdapter } from '@dns-ops/db';
import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import type { Env } from '../types.js';
import { shadowComparisonRoutes } from './shadow-comparison.js';

// =============================================================================
// CONSTANTS
// =============================================================================

const TENANT_A = 'tenant-aaaa-0001';
const TENANT_B = 'tenant-bbbb-0002';

// =============================================================================
// MOCK DB INFRASTRUCTURE
// =============================================================================

interface MockState {
  domains: Array<Record<string, unknown>>;
  snapshots: Array<Record<string, unknown>>;
  findings: Array<Record<string, unknown>>;
  shadowComparisons: Array<Record<string, unknown>>;
  legacyAccessLogs: Array<Record<string, unknown>>;
  providerBaselines: Array<Record<string, unknown>>;
  templateOverrides: Array<Record<string, unknown>>;
  mismatchReports: Array<Record<string, unknown>>;
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

function createMockDb(state: MockState): IDatabaseAdapter {
  return {
    getDrizzle: vi.fn(),
    select: vi.fn(async (table: unknown) => {
      const name = getTableName(table);
      if (name === 'domains') return [...state.domains];
      if (name === 'snapshots') return [...state.snapshots];
      if (name === 'findings') return [...state.findings];
      if (name === 'shadow_comparisons') return [...state.shadowComparisons];
      if (name === 'legacy_access_logs') return [...state.legacyAccessLogs];
      if (name === 'provider_baselines') return [...state.providerBaselines];
      if (name === 'template_overrides') return [...state.templateOverrides];
      if (name === 'mismatch_reports') return [...state.mismatchReports];
      return [];
    }),
    selectWhere: vi.fn(async (table: unknown, condition: unknown) => {
      const name = getTableName(table);
      const param = getConditionParam(condition);
      if (name === 'shadow_comparisons')
        return state.shadowComparisons.filter(
          (r) => r.domain === param || r.snapshotId === param || r.id === param
        );
      if (name === 'legacy_access_logs')
        return state.legacyAccessLogs.filter((r) => r.domain === param || r.toolType === param);
      if (name === 'provider_baselines')
        return state.providerBaselines.filter((r) => r.providerKey === param || r.status === param);
      if (name === 'template_overrides')
        return state.templateOverrides.filter(
          (r) => r.providerKey === param || r.tenantId === param
        );
      if (name === 'mismatch_reports')
        return state.mismatchReports.filter((r) => r.domain === param);
      if (name === 'findings') return state.findings.filter((r) => r.snapshotId === param);
      if (name === 'snapshots') return state.snapshots.filter((r) => r.domainId === param);
      return [];
    }),
    selectOne: vi.fn(async (table: unknown, condition: unknown) => {
      const name = getTableName(table);
      const param = getConditionParam(condition);
      if (name === 'domains')
        return (
          state.domains.find(
            (r) => r.id === param || r.normalizedName === param || r.name === param
          ) || null
        );
      if (name === 'snapshots') return state.snapshots.find((r) => r.id === param) || null;
      if (name === 'shadow_comparisons')
        return state.shadowComparisons.find((r) => r.id === param) || null;
      if (name === 'provider_baselines')
        return state.providerBaselines.find((r) => r.providerKey === param) || null;
      return null;
    }),
    insert: vi.fn(async (_table: unknown, values: Record<string, unknown>) => {
      const name = getTableName(_table);
      const row = {
        id: `${name}-${Date.now()}-${Math.random()}`,
        createdAt: new Date(),
        ...values,
      };
      if (name === 'shadow_comparisons') state.shadowComparisons.push(row);
      if (name === 'legacy_access_logs') state.legacyAccessLogs.push(row);
      if (name === 'mismatch_reports') state.mismatchReports.push(row);
      return row;
    }),
    insertMany: vi.fn(),
    update: vi.fn(async (_table: unknown, values: Record<string, unknown>, condition: unknown) => {
      const name = getTableName(_table);
      const param = getConditionParam(condition);
      if (name === 'shadow_comparisons') {
        const idx = state.shadowComparisons.findIndex((r) => r.id === param);
        if (idx >= 0) {
          state.shadowComparisons[idx] = { ...state.shadowComparisons[idx], ...values };
          return [state.shadowComparisons[idx]];
        }
      }
      return [];
    }),
    updateOne: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(async (cb: (db: IDatabaseAdapter) => Promise<unknown>) =>
      cb(createMockDb(state))
    ),
  } as unknown as IDatabaseAdapter;
}

// =============================================================================
// APP FACTORY
// =============================================================================

function createAppForTenant(state: MockState, tenantId?: string) {
  const app = new Hono<Env>();
  const mockDb = createMockDb(state);
  app.use('*', async (c, next) => {
    c.set('db', mockDb);
    if (tenantId) {
      c.set('tenantId', tenantId);
      c.set('actorId', `actor-${tenantId}`);
    }
    await next();
  });
  app.route('/api/shadow-comparison', shadowComparisonRoutes);
  return app;
}

// =============================================================================
// SEEDED TWO-TENANT STATE
// =============================================================================

function twoTenantState(): MockState {
  const now = new Date();
  return {
    domains: [
      {
        id: 'dom-a',
        name: 'alpha.com',
        normalizedName: 'alpha.com',
        tenantId: TENANT_A,
      },
      {
        id: 'dom-b',
        name: 'bravo.com',
        normalizedName: 'bravo.com',
        tenantId: TENANT_B,
      },
    ],
    snapshots: [
      {
        id: 'snap-a',
        domainId: 'dom-a',
        domainName: 'alpha.com',
        resultState: 'complete',
        rulesetVersionId: null,
        queriedNames: ['alpha.com'],
        queriedTypes: ['A', 'MX'],
        vantages: ['google-dns'],
        metadata: {},
        createdAt: now,
        zoneManagement: 'unmanaged',
      },
      {
        id: 'snap-b',
        domainId: 'dom-b',
        domainName: 'bravo.com',
        resultState: 'complete',
        rulesetVersionId: null,
        queriedNames: ['bravo.com'],
        queriedTypes: ['A', 'MX'],
        vantages: ['google-dns'],
        metadata: {},
        createdAt: now,
        zoneManagement: 'unmanaged',
      },
    ],
    findings: [
      {
        id: 'find-a',
        snapshotId: 'snap-a',
        type: 'mail.no-spf-record',
        title: 'No SPF',
        description: 'Missing SPF',
        severity: 'high',
        ruleId: 'mail.spf.v1',
      },
    ],
    shadowComparisons: [
      {
        id: 'sc-a',
        snapshotId: 'snap-a',
        domain: 'alpha.com',
        tenantId: TENANT_A,
        status: 'mismatch',
        comparedAt: now,
        comparisons: [],
        metrics: {},
        summary: 'Test A',
        adjudication: null,
        acknowledgedAt: null,
        acknowledgedBy: null,
        adjudicationNotes: null,
      },
      {
        id: 'sc-b',
        snapshotId: 'snap-b',
        domain: 'bravo.com',
        tenantId: TENANT_B,
        status: 'match',
        comparedAt: now,
        comparisons: [],
        metrics: {},
        summary: 'Test B',
        adjudication: null,
        acknowledgedAt: null,
        acknowledgedBy: null,
        adjudicationNotes: null,
      },
    ],
    legacyAccessLogs: [
      {
        id: 'log-a',
        toolType: 'dmarc-check',
        domain: 'alpha.com',
        requestedAt: now,
        requestSource: 'api',
        responseStatus: 'success',
        outputSummary: {},
        tenantId: TENANT_A,
      },
      {
        id: 'log-b',
        toolType: 'dmarc-check',
        domain: 'bravo.com',
        requestedAt: now,
        requestSource: 'api',
        responseStatus: 'success',
        outputSummary: {},
        tenantId: TENANT_B,
      },
    ],
    providerBaselines: [
      {
        providerKey: 'google-workspace',
        providerName: 'Google Workspace',
        status: 'active',
        baseline: { spf: {} },
        dkimSelectors: ['google'],
        mxPatterns: ['*.google.com'],
        spfIncludes: ['_spf.google.com'],
        version: '1.0.0',
      },
    ],
    templateOverrides: [
      {
        id: 'ovr-a',
        providerKey: 'google-workspace',
        tenantId: TENANT_A,
        overrideData: { dkimSelectors: ['custom-a'] },
        appliesToDomains: [],
      },
      {
        id: 'ovr-b',
        providerKey: 'google-workspace',
        tenantId: TENANT_B,
        overrideData: { dkimSelectors: ['custom-b'] },
        appliesToDomains: [],
      },
    ],
    mismatchReports: [
      {
        id: 'mr-a',
        domain: 'alpha.com',
        tenantId: TENANT_A,
        periodStart: now,
        periodEnd: now,
        matchRate: 0.8,
        cutoverReady: false,
        totalComparisons: 10,
        mismatchBreakdown: {},
        cutoverNotes: '',
        generatedAt: now,
        generatedBy: 'system',
      },
      {
        id: 'mr-b',
        domain: 'bravo.com',
        tenantId: TENANT_B,
        periodStart: now,
        periodEnd: now,
        matchRate: 0.95,
        cutoverReady: true,
        totalComparisons: 20,
        mismatchBreakdown: {},
        cutoverNotes: '',
        generatedAt: now,
        generatedBy: 'system',
      },
    ],
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('Shadow Comparison Routes — Tenant Isolation', () => {
  // =========================================================================
  // BUG-1: GET /provider-baselines used caller-supplied ?tenantId
  // =========================================================================
  describe('GET /provider-baselines (collection)', () => {
    it('tenant-A sees only their own overrides applied', async () => {
      const state = twoTenantState();
      const app = createAppForTenant(state, TENANT_A);

      const res = await app.request('/api/shadow-comparison/provider-baselines');
      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        baselines: Array<{ dkimSelectors: string[]; overridesApplied: string[] }>;
      };

      const gw = json.baselines[0];
      expect(gw.dkimSelectors).toEqual(['custom-a']);
      expect(gw.overridesApplied).toContain('ovr-a');
      expect(gw.overridesApplied).not.toContain('ovr-b');
    });

    it('tenant-B sees only their own overrides applied', async () => {
      const state = twoTenantState();
      const app = createAppForTenant(state, TENANT_B);

      const res = await app.request('/api/shadow-comparison/provider-baselines');
      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        baselines: Array<{ dkimSelectors: string[]; overridesApplied: string[] }>;
      };

      const gw = json.baselines[0];
      expect(gw.dkimSelectors).toEqual(['custom-b']);
      expect(gw.overridesApplied).toContain('ovr-b');
      expect(gw.overridesApplied).not.toContain('ovr-a');
    });
  });

  // =========================================================================
  // BUG-1 (cont): GET /provider-baselines/:providerKey used c.req.query('tenantId')
  // =========================================================================
  describe('GET /provider-baselines/:providerKey', () => {
    it('uses auth-context tenantId, not query param', async () => {
      const state = twoTenantState();
      const app = createAppForTenant(state, TENANT_A);

      // Attempt to bypass by passing tenant-B's tenantId as query param
      const res = await app.request(
        `/api/shadow-comparison/provider-baselines/google-workspace?tenantId=${TENANT_B}`
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        baseline: { dkimSelectors: string[]; overridesApplied: string[] };
      };

      // Should still see tenant-A overrides (query param ignored)
      expect(json.baseline.dkimSelectors).toEqual(['custom-a']);
      expect(json.baseline.overridesApplied).toContain('ovr-a');
      expect(json.baseline.overridesApplied).not.toContain('ovr-b');
    });
  });

  // =========================================================================
  // BUG-2: GET /legacy-logs returned ALL tenants' logs
  // =========================================================================
  describe('GET /legacy-logs', () => {
    it('tenant-A sees only their own logs', async () => {
      const state = twoTenantState();
      const app = createAppForTenant(state, TENANT_A);

      const res = await app.request('/api/shadow-comparison/legacy-logs');
      expect(res.status).toBe(200);
      const json = (await res.json()) as { logs: Array<{ id: string; domain: string }> };

      expect(json.logs).toHaveLength(1);
      expect(json.logs[0].id).toBe('log-a');
      expect(json.logs[0].domain).toBe('alpha.com');
    });

    it('tenant-B sees only their own logs', async () => {
      const state = twoTenantState();
      const app = createAppForTenant(state, TENANT_B);

      const res = await app.request('/api/shadow-comparison/legacy-logs');
      expect(res.status).toBe(200);
      const json = (await res.json()) as { logs: Array<{ id: string; domain: string }> };

      expect(json.logs).toHaveLength(1);
      expect(json.logs[0].id).toBe('log-b');
      expect(json.logs[0].domain).toBe('bravo.com');
    });

    it('tenant-A cannot see tenant-B logs even with different limit', async () => {
      const state = twoTenantState();
      const app = createAppForTenant(state, TENANT_A);

      const res = await app.request('/api/shadow-comparison/legacy-logs?limit=1000');
      const json = (await res.json()) as { logs: Array<{ id: string }> };

      // Even with high limit, should only see own logs
      const ids = json.logs.map((l) => l.id);
      expect(ids).not.toContain('log-b');
    });
  });

  // =========================================================================
  // BUG-3: GET /mismatch-reports/:domain returned ALL tenants' reports
  // =========================================================================
  describe('GET /mismatch-reports/:domain', () => {
    it('tenant-A sees only their own mismatch reports', async () => {
      const state = twoTenantState();
      const app = createAppForTenant(state, TENANT_A);

      const res = await app.request('/api/shadow-comparison/mismatch-reports/alpha.com');
      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        reports: Array<{ id: string }>;
        latestReport: { matchRate: number } | null;
      };

      expect(json.reports).toHaveLength(1);
      expect(json.reports[0].id).toBe('mr-a');
      expect(json.latestReport?.matchRate).toBe(0.8);
    });

    it('tenant-B sees only their own reports for a shared domain', async () => {
      const state = twoTenantState();
      // Add a report for both tenants on the same domain
      state.mismatchReports.push({
        id: 'mr-shared-a',
        domain: 'shared.com',
        tenantId: TENANT_A,
        periodStart: new Date(),
        periodEnd: new Date(),
        matchRate: 0.5,
        cutoverReady: false,
        totalComparisons: 5,
        mismatchBreakdown: {},
        cutoverNotes: '',
        generatedAt: new Date(),
      });
      state.mismatchReports.push({
        id: 'mr-shared-b',
        domain: 'shared.com',
        tenantId: TENANT_B,
        periodStart: new Date(),
        periodEnd: new Date(),
        matchRate: 0.9,
        cutoverReady: true,
        totalComparisons: 15,
        mismatchBreakdown: {},
        cutoverNotes: '',
        generatedAt: new Date(),
      });

      const appA = createAppForTenant(state, TENANT_A);
      const resA = await appA.request('/api/shadow-comparison/mismatch-reports/shared.com');
      const jsonA = (await resA.json()) as { reports: Array<{ id: string }> };
      expect(jsonA.reports).toHaveLength(1);
      expect(jsonA.reports[0].id).toBe('mr-shared-a');

      const appB = createAppForTenant(state, TENANT_B);
      const resB = await appB.request('/api/shadow-comparison/mismatch-reports/shared.com');
      const jsonB = (await resB.json()) as { reports: Array<{ id: string }> };
      expect(jsonB.reports).toHaveLength(1);
      expect(jsonB.reports[0].id).toBe('mr-shared-b');
    });
  });

  // =========================================================================
  // BUG-4: GET /stats returned cross-tenant aggregate stats
  // =========================================================================
  describe('GET /stats', () => {
    it('tenant-A stats reflect only their own comparisons', async () => {
      const state = twoTenantState();
      const app = createAppForTenant(state, TENANT_A);

      const res = await app.request('/api/shadow-comparison/stats');
      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        stats: { total: number; mismatches: number; matches: number };
        pendingAdjudication: number;
      };

      // Tenant-A has 1 comparison (mismatch)
      expect(json.stats.total).toBe(1);
      expect(json.stats.mismatches).toBe(1);
      expect(json.stats.matches).toBe(0);
      expect(json.pendingAdjudication).toBe(1); // sc-a has no adjudication
    });

    it('tenant-B stats reflect only their own comparisons', async () => {
      const state = twoTenantState();
      const app = createAppForTenant(state, TENANT_B);

      const res = await app.request('/api/shadow-comparison/stats');
      const json = (await res.json()) as {
        stats: { total: number; mismatches: number; matches: number };
        pendingAdjudication: number;
      };

      // Tenant-B has 1 comparison (match)
      expect(json.stats.total).toBe(1);
      expect(json.stats.matches).toBe(1);
      expect(json.stats.mismatches).toBe(0);
      expect(json.pendingAdjudication).toBe(0); // matches don't need adjudication
    });

    it('stats do NOT include cross-tenant data', async () => {
      const state = twoTenantState();
      const appA = createAppForTenant(state, TENANT_A);
      const appB = createAppForTenant(state, TENANT_B);

      const resA = await appA.request('/api/shadow-comparison/stats');
      const jsonA = (await resA.json()) as { stats: { total: number } };

      const resB = await appB.request('/api/shadow-comparison/stats');
      const jsonB = (await resB.json()) as { stats: { total: number } };

      // Combined should equal 2, each should see 1
      expect(jsonA.stats.total + jsonB.stats.total).toBe(2);
      expect(jsonA.stats.total).toBe(1);
      expect(jsonB.stats.total).toBe(1);
    });
  });

  // =========================================================================
  // BUG-5: POST /compare accepted snapshots from other tenants
  // =========================================================================
  describe('POST /compare', () => {
    it('tenant-A can compare against their own snapshot', async () => {
      const state = twoTenantState();
      const app = createAppForTenant(state, TENANT_A);

      const res = await app.request('/api/shadow-comparison/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snapshotId: 'snap-a',
          legacyOutput: {
            domain: 'alpha.com',
            checkedAt: new Date().toISOString(),
            dmarc: { present: true, valid: true, record: 'v=DMARC1; p=reject' },
            spf: { present: true, valid: true, record: 'v=spf1 -all' },
            dkim: { present: true, valid: true },
          },
        }),
      });

      // Should succeed (200) — tenant-A owns the snapshot's domain
      expect(res.status).toBe(200);
    });

    it('tenant-B CANNOT compare against tenant-A snapshot', async () => {
      const state = twoTenantState();
      const app = createAppForTenant(state, TENANT_B);

      const res = await app.request('/api/shadow-comparison/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snapshotId: 'snap-a', // belongs to tenant-A
          legacyOutput: {
            domain: 'alpha.com',
            checkedAt: new Date().toISOString(),
            dmarc: { present: true, valid: true, record: 'v=DMARC1; p=reject' },
            spf: { present: true, valid: true, record: 'v=spf1 -all' },
            dkim: { present: true, valid: true },
          },
        }),
      });

      // Should return 404 (not found from tenant-B's perspective)
      expect(res.status).toBe(404);
    });
  });

  // =========================================================================
  // GET /domain/:domain — tenant-scoped
  // =========================================================================
  describe('GET /domain/:domain', () => {
    it('tenant-A sees only their own domain comparisons', async () => {
      const state = twoTenantState();
      const app = createAppForTenant(state, TENANT_A);

      const res = await app.request('/api/shadow-comparison/domain/alpha.com');
      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        comparisons: Array<{ id: string }>;
        count: number;
      };

      expect(json.count).toBe(1);
      expect(json.comparisons[0].id).toBe('sc-a');
    });

    it('tenant-B cannot see tenant-A domain comparisons', async () => {
      const state = twoTenantState();
      const app = createAppForTenant(state, TENANT_B);

      const res = await app.request('/api/shadow-comparison/domain/alpha.com');
      expect(res.status).toBe(200);
      const json = (await res.json()) as { count: number };

      // Tenant-B should see 0 comparisons for alpha.com
      expect(json.count).toBe(0);
    });
  });

  // =========================================================================
  // GET /:id — tenant-scoped individual comparison
  // =========================================================================
  describe('GET /:id', () => {
    it('tenant-A can read their own comparison', async () => {
      const state = twoTenantState();
      const app = createAppForTenant(state, TENANT_A);

      const res = await app.request('/api/shadow-comparison/sc-a');
      expect(res.status).toBe(200);
      const json = (await res.json()) as { comparison: { id: string } };
      expect(json.comparison.id).toBe('sc-a');
    });

    it('tenant-B CANNOT read tenant-A comparison', async () => {
      const state = twoTenantState();
      const app = createAppForTenant(state, TENANT_B);

      const res = await app.request('/api/shadow-comparison/sc-a');
      expect(res.status).toBe(404);
    });
  });

  // =========================================================================
  // Authentication requirement
  // =========================================================================
  describe('Authentication', () => {
    it('unauthenticated request to /stats returns 401', async () => {
      const state = twoTenantState();
      // No tenantId = not authenticated
      const app = createAppForTenant(state, undefined);

      const res = await app.request('/api/shadow-comparison/stats');
      expect(res.status).toBe(401);
    });

    it('unauthenticated request to /legacy-logs returns 401', async () => {
      const state = twoTenantState();
      const app = createAppForTenant(state, undefined);

      const res = await app.request('/api/shadow-comparison/legacy-logs');
      expect(res.status).toBe(401);
    });

    it('unauthenticated request to /compare returns 401', async () => {
      const state = twoTenantState();
      const app = createAppForTenant(state, undefined);

      const res = await app.request('/api/shadow-comparison/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snapshotId: 'snap-a',
          legacyOutput: {
            domain: 'alpha.com',
            dmarc: { present: true, valid: true },
            spf: { present: true, valid: true },
            dkim: { present: true, valid: true },
          },
        }),
      });
      expect(res.status).toBe(401);
    });
  });
});
