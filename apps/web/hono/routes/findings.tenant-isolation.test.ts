/**
 * Findings Route Tenant Isolation Tests - PR-09.2
 *
 * Test: Create domain+snapshot+findings as tenant A
 *       Read as tenant B → 404
 *       List findings as tenant B → 404/empty
 *       Public read (no tenant header) can read unowned domains
 *       but NOT tenant A's domains
 */

import type { IDatabaseAdapter } from '@dns-ops/db';
import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import type { Env } from '../types.js';
import { findingsRoutes } from './findings.js';

interface MockState {
  snapshots: Array<Record<string, unknown>>;
  domains: Array<Record<string, unknown>>;
  findings: Array<Record<string, unknown>>;
  suggestions: Array<Record<string, unknown>>;
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
      if (tableName === 'findings') return [...state.findings];
      if (tableName === 'suggestions') return [...state.suggestions];
      return [];
    }),
    selectOne: vi.fn(async (table: unknown, condition: unknown) => {
      const tableName = getTableName(table);
      const condVal = getConditionParam(condition);
      if (tableName === 'snapshots') return state.snapshots.find((s) => s.id === condVal) || null;
      if (tableName === 'domains') return state.domains.find((d) => d.id === condVal) || null;
      if (tableName === 'findings') return state.findings.find((f) => f.id === condVal) || null;
      if (tableName === 'suggestions')
        return state.suggestions.find((s) => s.id === condVal) || null;
      return null;
    }),
    selectWhere: vi.fn(async (table: unknown, condition: unknown) => {
      const tableName = getTableName(table);
      const condVal = getConditionParam(condition);
      if (tableName === 'findings') return state.findings.filter((f) => f.snapshotId === condVal);
      if (tableName === 'suggestions')
        return state.suggestions.filter((s) => s.findingId === condVal);
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
  app.route('/api', findingsRoutes);
  return app;
}

const SNAPSHOT_ID = 'snapshot-a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const FINDING_ID = 'finding-1-2-3-4';
const DOMAIN_ID = 'domain-b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';
const TENANT_A = 'tenant-a';
const TENANT_B = 'tenant-b';

describe('PR-09.2: Cross-Tenant Read Isolation Tests', () => {
  describe('GET /api/snapshot/:snapshotId/findings', () => {
    it('should return 404 when tenant B reads tenant A findings', async () => {
      const state: MockState = {
        snapshots: [
          {
            id: SNAPSHOT_ID,
            domainId: DOMAIN_ID,
            domainName: 'example.com',
            resultState: 'complete',
            zoneManagement: 'managed',
            tenantId: TENANT_A, // Belongs to tenant A
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
        suggestions: [],
      };

      // Tenant B tries to read
      const app = createAppWithTenant(state, TENANT_B);

      const response = await app.request(`/api/snapshot/${SNAPSHOT_ID}/findings`);

      // Should return 404 (not 403) to avoid leaking existence
      expect(response.status).toBe(404);
    });

    it('should succeed when tenant A reads their own findings', async () => {
      const state: MockState = {
        snapshots: [
          {
            id: SNAPSHOT_ID,
            domainId: DOMAIN_ID,
            domainName: 'example.com',
            resultState: 'complete',
            zoneManagement: 'managed',
            tenantId: TENANT_A,
            createdAt: new Date(),
          },
        ],
        domains: [
          {
            id: DOMAIN_ID,
            name: 'example.com',
            normalizedName: 'example.com',
            zoneManagement: 'managed',
            tenantId: TENANT_A,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
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
        suggestions: [],
      };

      // Tenant A reads their own
      const app = createAppWithTenant(state, TENANT_A);

      const response = await app.request(`/api/snapshot/${SNAPSHOT_ID}/findings`);

      expect(response.status).toBe(200);
      const json = (await response.json()) as { findings: unknown[] };
      expect(json.findings).toHaveLength(1);
    });

    it('should allow authenticated tenant to read unowned domain findings (public read)', async () => {
      const state: MockState = {
        snapshots: [
          {
            id: SNAPSHOT_ID,
            domainId: DOMAIN_ID,
            domainName: 'example.com',
            resultState: 'complete',
            zoneManagement: 'managed',
            tenantId: null, // Unowned
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
        suggestions: [],
      };

      // Any authenticated tenant can read unowned domain findings
      const app = createAppWithTenant(state, TENANT_A);

      const response = await app.request(`/api/snapshot/${SNAPSHOT_ID}/findings`);

      // Should succeed - unowned domains are publicly readable
      expect(response.status).toBe(200);
    });

    it('should fail without auth for tenant-owned domain findings', async () => {
      const state: MockState = {
        snapshots: [
          {
            id: SNAPSHOT_ID,
            domainId: DOMAIN_ID,
            domainName: 'example.com',
            resultState: 'complete',
            zoneManagement: 'managed',
            tenantId: TENANT_A, // Owned by tenant A
            createdAt: new Date(),
          },
        ],
        domains: [
          {
            id: DOMAIN_ID,
            name: 'example.com',
            normalizedName: 'example.com',
            zoneManagement: 'managed',
            tenantId: TENANT_A,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
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
        suggestions: [],
      };

      // No tenant context (public access)
      const app = createAppWithTenant(state, undefined);

      const response = await app.request(`/api/snapshot/${SNAPSHOT_ID}/findings`);

      // Should return 404 - owned domains require auth
      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/findings/:findingId', () => {
    it('should return 404 when tenant B reads tenant A finding', async () => {
      const state: MockState = {
        snapshots: [
          {
            id: SNAPSHOT_ID,
            domainId: DOMAIN_ID,
            domainName: 'example.com',
            resultState: 'complete',
            zoneManagement: 'managed',
            tenantId: TENANT_A,
            createdAt: new Date(),
          },
        ],
        domains: [
          {
            id: DOMAIN_ID,
            name: 'example.com',
            normalizedName: 'example.com',
            zoneManagement: 'managed',
            tenantId: TENANT_A,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
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
        suggestions: [],
      };

      // Tenant B tries to read
      const app = createAppWithTenant(state, TENANT_B);

      const response = await app.request(`/api/findings/${FINDING_ID}`);

      // Should return 404 (not 403) to avoid leaking existence
      expect(response.status).toBe(404);
    });

    it('should succeed when tenant A reads their own finding', async () => {
      const state: MockState = {
        snapshots: [
          {
            id: SNAPSHOT_ID,
            domainId: DOMAIN_ID,
            domainName: 'example.com',
            resultState: 'complete',
            zoneManagement: 'managed',
            tenantId: TENANT_A,
            createdAt: new Date(),
          },
        ],
        domains: [
          {
            id: DOMAIN_ID,
            name: 'example.com',
            normalizedName: 'example.com',
            zoneManagement: 'managed',
            tenantId: TENANT_A,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
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
        suggestions: [],
      };

      // Tenant A reads their own
      const app = createAppWithTenant(state, TENANT_A);

      const response = await app.request(`/api/findings/${FINDING_ID}`);

      expect(response.status).toBe(200);
      const json = (await response.json()) as { finding: { id: string } };
      expect(json.finding.id).toBe(FINDING_ID);
    });
  });

  describe('Empty list for cross-tenant access', () => {
    it('should return empty list when tenant B lists tenant A findings', async () => {
      const state: MockState = {
        snapshots: [
          {
            id: SNAPSHOT_ID,
            domainId: DOMAIN_ID,
            domainName: 'example.com',
            resultState: 'complete',
            zoneManagement: 'managed',
            tenantId: TENANT_A,
            createdAt: new Date(),
          },
        ],
        domains: [
          {
            id: DOMAIN_ID,
            name: 'example.com',
            normalizedName: 'example.com',
            zoneManagement: 'managed',
            tenantId: TENANT_A,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
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
        suggestions: [],
      };

      // Tenant B lists findings for a snapshot they don't own
      const app = createAppWithTenant(state, TENANT_B);

      // List route may be /api/findings?snapshotId=xxx
      const response = await app.request(`/api/findings?snapshotId=${SNAPSHOT_ID}`);

      // Should return 404 or empty array - doesn't leak tenant A's data
      if (response.status === 200) {
        const json = (await response.json()) as { findings: unknown[] };
        expect(json.findings).toHaveLength(0);
      } else {
        expect(response.status).toBe(404);
      }
    });
  });
});
