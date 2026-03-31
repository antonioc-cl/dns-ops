/**
 * Simulation Route Tenant Isolation Tests - PR-09.1
 *
 * Test: simulation with tenant A's snapshot using tenant B's creds → 404
 * Test: unowned domain snapshot without auth → succeeds (public read)
 */

import type { IDatabaseAdapter } from '@dns-ops/db';
import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import type { Env } from '../types.js';
import { simulationRoutes } from './simulation.js';

interface MockState {
  snapshots: Array<Record<string, unknown>>;
  domains: Array<Record<string, unknown>>;
  observations: Array<Record<string, unknown>>;
  recordSets: Array<Record<string, unknown>>;
  findings: Array<Record<string, unknown>>;
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
      if (tableName === 'snapshots') return [...state.snapshots];
      if (tableName === 'domains') return [...state.domains];
      if (tableName === 'observations') return [...state.observations];
      if (tableName === 'record_sets') return [...state.recordSets];
      if (tableName === 'findings') return [...state.findings];
      return [];
    }),
    selectOne: vi.fn(async (table: unknown, condition: unknown) => {
      const tableName = getTableName(table);
      const condVal = getConditionParam(condition);
      if (tableName === 'snapshots') return state.snapshots.find((s) => s.id === condVal) || null;
      if (tableName === 'domains') return state.domains.find((d) => d.id === condVal) || null;
      if (tableName === 'findings') return state.findings.find((f) => f.id === condVal) || null;
      return null;
    }),
    selectWhere: vi.fn(async (table: unknown, condition: unknown) => {
      const tableName = getTableName(table);
      const condVal = getConditionParam(condition);
      if (tableName === 'observations')
        return state.observations.filter((o) => o.snapshotId === condVal);
      if (tableName === 'record_sets')
        return state.recordSets.filter((r) => r.snapshotId === condVal);
      if (tableName === 'findings') return state.findings.filter((f) => f.snapshotId === condVal);
      return [];
    }),
    insert: vi.fn(),
    insertMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } as unknown as IDatabaseAdapter;
}

// Helper to create app with specific tenant context
function createAppWithTenant(state: MockState, tenantId?: string) {
  const app = new Hono<Env>();
  const mockDb = createMockDb(state);
  app.use('*', async (c, next) => {
    c.set('db', mockDb);
    if (tenantId) {
      c.set('tenantId', tenantId);
      c.set('actorId', 'test-actor');
    }
    await next();
  });
  app.route('/api/simulate', simulationRoutes);
  return app;
}

const SNAPSHOT_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const DOMAIN_ID = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';
const TENANT_A = 'tenant-a';
const TENANT_B = 'tenant-b';

describe('PR-09.1: Simulation Route Tenant Isolation', () => {
  describe('Cross-tenant access prevention', () => {
    it('should return 404 when tenant B tries to simulate tenant A snapshot', async () => {
      const state: MockState = {
        snapshots: [
          {
            id: SNAPSHOT_ID,
            domainId: DOMAIN_ID,
            domainName: 'example.com',
            resultState: 'complete',
            zoneManagement: 'managed',
            triggeredBy: 'test',
            createdAt: new Date(),
          },
        ],
        domains: [
          {
            id: DOMAIN_ID,
            name: 'example.com',
            normalizedName: 'example.com',
            zoneManagement: 'managed',
            tenantId: TENANT_A, // Belongs to tenant A
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        observations: [],
        recordSets: [],
        findings: [],
      };

      // Tenant B tries to access
      const app = createAppWithTenant(state, TENANT_B);

      const response = await app.request('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotId: SNAPSHOT_ID }),
      });

      // Should return 404 (not 403) to avoid leaking existence
      expect(response.status).toBe(404);
      const json = (await response.json()) as { error: string };
      expect(json.error).toBe('Snapshot not found');
    });

    it('should succeed when tenant A accesses their own snapshot', async () => {
      const state: MockState = {
        snapshots: [
          {
            id: SNAPSHOT_ID,
            domainId: DOMAIN_ID,
            domainName: 'example.com',
            resultState: 'complete',
            zoneManagement: 'managed',
            triggeredBy: 'test',
            createdAt: new Date(),
          },
        ],
        domains: [
          {
            id: DOMAIN_ID,
            name: 'example.com',
            normalizedName: 'example.com',
            zoneManagement: 'managed',
            tenantId: TENANT_A, // Belongs to tenant A
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        observations: [
          {
            id: 'obs-1',
            snapshotId: SNAPSHOT_ID,
            queryName: 'example.com',
            queryType: 'MX',
            vantageType: 'public-recursive',
            vantageIdentifier: '8.8.8.8',
            status: 'success',
            answerSection: [],
            createdAt: new Date(),
          },
        ],
        recordSets: [],
        findings: [
          {
            id: 'finding-1',
            snapshotId: SNAPSHOT_ID,
            type: 'mail.no-spf-record',
            title: 'No SPF record',
            severity: 'high',
            confidence: 'certain',
            riskPosture: 'high',
            blastRadius: 'single-domain',
            reviewOnly: false,
            evidence: [],
            ruleId: 'mail.spf-analysis.v1',
            ruleVersion: '1.0.0',
            createdAt: new Date(),
          },
        ],
      };

      // Tenant A accesses their own
      const app = createAppWithTenant(state, TENANT_A);

      const response = await app.request('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotId: SNAPSHOT_ID }),
      });

      expect(response.status).toBe(200);
      const json = (await response.json()) as { domain: string };
      expect(json.domain).toBe('example.com');
    });

    it('should allow authenticated tenant to access unowned domain snapshot (public read)', async () => {
      const state: MockState = {
        snapshots: [
          {
            id: SNAPSHOT_ID,
            domainId: DOMAIN_ID,
            domainName: 'example.com',
            resultState: 'complete',
            zoneManagement: 'managed',
            triggeredBy: 'test',
            createdAt: new Date(),
          },
        ],
        domains: [
          {
            id: DOMAIN_ID,
            name: 'example.com',
            normalizedName: 'example.com',
            zoneManagement: 'managed',
            tenantId: null, // Unowned domain
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        observations: [
          {
            id: 'obs-1',
            snapshotId: SNAPSHOT_ID,
            queryName: 'example.com',
            queryType: 'MX',
            vantageType: 'public-recursive',
            vantageIdentifier: '8.8.8.8',
            status: 'success',
            answerSection: [],
            createdAt: new Date(),
          },
        ],
        recordSets: [],
        findings: [
          {
            id: 'finding-1',
            snapshotId: SNAPSHOT_ID,
            type: 'mail.no-spf-record',
            title: 'No SPF record',
            severity: 'high',
            confidence: 'certain',
            riskPosture: 'high',
            blastRadius: 'single-domain',
            reviewOnly: false,
            evidence: [],
            ruleId: 'mail.spf-analysis.v1',
            ruleVersion: '1.0.0',
            createdAt: new Date(),
          },
        ],
      };

      // Authenticated tenant can access unowned domain (public read)
      const app = createAppWithTenant(state, TENANT_A);

      const response = await app.request('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotId: SNAPSHOT_ID }),
      });

      // Should succeed - unowned domains are publicly readable
      expect(response.status).toBe(200);
      const json = (await response.json()) as { domain: string };
      expect(json.domain).toBe('example.com');
    });
  });

  describe('Public read access for unowned domains', () => {
    it('should require auth for unowned domain snapshot (no public access)', async () => {
      const state: MockState = {
        snapshots: [
          {
            id: SNAPSHOT_ID,
            domainId: DOMAIN_ID,
            domainName: 'example.com',
            resultState: 'complete',
            zoneManagement: 'managed',
            triggeredBy: 'test',
            createdAt: new Date(),
          },
        ],
        domains: [
          {
            id: DOMAIN_ID,
            name: 'example.com',
            normalizedName: 'example.com',
            zoneManagement: 'managed',
            tenantId: null, // Unowned
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        observations: [
          {
            id: 'obs-1',
            snapshotId: SNAPSHOT_ID,
            queryName: 'example.com',
            queryType: 'MX',
            vantageType: 'public-recursive',
            vantageIdentifier: '8.8.8.8',
            status: 'success',
            answerSection: [],
            createdAt: new Date(),
          },
        ],
        recordSets: [],
        findings: [
          {
            id: 'finding-1',
            snapshotId: SNAPSHOT_ID,
            type: 'mail.no-spf-record',
            title: 'No SPF record',
            severity: 'high',
            confidence: 'certain',
            riskPosture: 'high',
            blastRadius: 'single-domain',
            reviewOnly: false,
            evidence: [],
            ruleId: 'mail.spf-analysis.v1',
            ruleVersion: '1.0.0',
            createdAt: new Date(),
          },
        ],
      };

      // No tenant context (no auth)
      const app = createAppWithTenant(state, undefined);

      const response = await app.request('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotId: SNAPSHOT_ID }),
      });

      // Should return 401 - auth required for all simulation routes
      expect(response.status).toBe(401);
    });

    it('should fail without auth for tenant-owned domain snapshot', async () => {
      const state: MockState = {
        snapshots: [
          {
            id: SNAPSHOT_ID,
            domainId: DOMAIN_ID,
            domainName: 'example.com',
            resultState: 'complete',
            zoneManagement: 'managed',
            triggeredBy: 'test',
            createdAt: new Date(),
          },
        ],
        domains: [
          {
            id: DOMAIN_ID,
            name: 'example.com',
            normalizedName: 'example.com',
            zoneManagement: 'managed',
            tenantId: TENANT_A, // Owned by tenant A
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        observations: [],
        recordSets: [],
        findings: [],
      };

      // No tenant context (public access)
      const app = createAppWithTenant(state, undefined);

      const response = await app.request('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotId: SNAPSHOT_ID }),
      });

      // Should return 401 - auth required for simulation routes
      expect(response.status).toBe(401);
    });
  });

  describe('Finding-based simulation tenant isolation', () => {
    it('should return 404 when tenant B tries to simulate tenant A finding', async () => {
      const FINDING_ID = 'finding-tenant-a';
      const state: MockState = {
        snapshots: [
          {
            id: SNAPSHOT_ID,
            domainId: DOMAIN_ID,
            domainName: 'example.com',
            resultState: 'complete',
            zoneManagement: 'managed',
            triggeredBy: 'test',
            createdAt: new Date(),
          },
        ],
        domains: [
          {
            id: DOMAIN_ID,
            name: 'example.com',
            normalizedName: 'example.com',
            zoneManagement: 'managed',
            tenantId: TENANT_A, // Belongs to tenant A
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        observations: [],
        recordSets: [],
        findings: [
          {
            id: FINDING_ID,
            snapshotId: SNAPSHOT_ID,
            type: 'mail.no-spf-record',
            title: 'No SPF record',
            severity: 'high',
            confidence: 'certain',
            riskPosture: 'high',
            blastRadius: 'single-domain',
            reviewOnly: false,
            evidence: [],
            ruleId: 'mail.spf-analysis.v1',
            ruleVersion: '1.0.0',
            createdAt: new Date(),
          },
        ],
      };

      // Tenant B tries to access via findingId
      const app = createAppWithTenant(state, TENANT_B);

      const response = await app.request('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ findingId: FINDING_ID }),
      });

      // Should return 404 (not 403) to avoid leaking existence
      expect(response.status).toBe(404);
      const json = (await response.json()) as { error: string };
      expect(json.error).toBe('Snapshot not found');
    });
  });
});
