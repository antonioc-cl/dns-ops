/**
 * Simulation route runtime tests
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
  suggestions: Array<Record<string, unknown>>;
  rulesetVersions: Array<Record<string, unknown>>;
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
    queryChunks?: Array<{
      constructor?: { name?: string };
      value?: unknown;
    }>;
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
      if (tableName === 'suggestions') return [...state.suggestions];
      if (tableName === 'ruleset_versions') return [...state.rulesetVersions];
      return [];
    }),
    selectOne: vi.fn(async (table: unknown, condition: unknown) => {
      const tableName = getTableName(table);
      const condVal = getConditionParam(condition);
      if (tableName === 'snapshots') return state.snapshots.find((s) => s.id === condVal) || null;
      if (tableName === 'domains') return state.domains.find((d) => d.id === condVal) || null;
      if (tableName === 'findings') return state.findings.find((f) => f.id === condVal) || null;
      if (tableName === 'ruleset_versions')
        return state.rulesetVersions.find((rv) => rv.version === condVal) || null;
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
      if (tableName === 'suggestions')
        return state.suggestions.filter((s) => s.findingId === condVal);
      return [];
    }),
    insert: vi.fn(async (_table: unknown, data: Record<string, unknown>) => ({
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date(),
    })),
    insertMany: vi.fn(async (_table: unknown, data: Array<Record<string, unknown>>) =>
      data.map((d) => ({
        id: crypto.randomUUID(),
        ...d,
        createdAt: new Date(),
      }))
    ),
    update: vi.fn(),
    delete: vi.fn(),
  } as unknown as IDatabaseAdapter;
}

function createApp(state: MockState) {
  const app = new Hono<Env>();
  const mockDb = createMockDb(state);
  app.use('*', async (c, next) => {
    c.set('db', mockDb);
    c.set('tenantId', 'test-tenant');
    c.set('actorId', 'test-actor');
    await next();
  });
  app.route('/api/simulate', simulationRoutes);
  return app;
}

const SNAPSHOT_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const DOMAIN_ID = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';
const FINDING_ID = 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f';

function baseState(): MockState {
  return {
    snapshots: [
      {
        id: SNAPSHOT_ID,
        domainId: DOMAIN_ID,
        domainName: 'example.com',
        resultState: 'complete',
        zoneManagement: 'managed',
        queriedNames: ['example.com'],
        queriedTypes: ['MX', 'TXT'],
        vantages: ['8.8.8.8'],
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
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    observations: [
      {
        id: 'obs-mx-1',
        snapshotId: SNAPSHOT_ID,
        queryName: 'example.com',
        queryType: 'MX',
        vantageType: 'public-recursive',
        vantageIdentifier: '8.8.8.8',
        status: 'success',
        answerSection: [
          { name: 'example.com', type: 'MX', ttl: 300, data: '10 mail.example.com.' },
        ],
        createdAt: new Date(),
      },
      {
        id: 'obs-txt-1',
        snapshotId: SNAPSHOT_ID,
        queryName: 'example.com',
        queryType: 'TXT',
        vantageType: 'public-recursive',
        vantageIdentifier: '8.8.8.8',
        status: 'success',
        answerSection: [],
        createdAt: new Date(),
      },
      {
        id: 'obs-dmarc-1',
        snapshotId: SNAPSHOT_ID,
        queryName: '_dmarc.example.com',
        queryType: 'TXT',
        vantageType: 'public-recursive',
        vantageIdentifier: '8.8.8.8',
        status: 'success',
        answerSection: [],
        createdAt: new Date(),
      },
    ],
    recordSets: [
      {
        id: 'rs-mx-1',
        snapshotId: SNAPSHOT_ID,
        name: 'example.com',
        type: 'MX',
        ttl: 300,
        values: ['10 mail.example.com.'],
        sourceObservationIds: ['obs-mx-1'],
        sourceVantages: ['8.8.8.8'],
        isConsistent: true,
        createdAt: new Date(),
      },
    ],
    findings: [
      {
        id: FINDING_ID,
        snapshotId: SNAPSHOT_ID,
        type: 'mail.no-spf-record',
        title: 'No SPF record for example.com',
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
      {
        id: 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80',
        snapshotId: SNAPSHOT_ID,
        type: 'mail.no-dmarc-record',
        title: 'No DMARC record for example.com',
        severity: 'high',
        confidence: 'certain',
        riskPosture: 'high',
        blastRadius: 'single-domain',
        reviewOnly: false,
        evidence: [],
        ruleId: 'mail.dmarc-analysis.v1',
        ruleVersion: '1.0.0',
        createdAt: new Date(),
      },
    ],
    suggestions: [],
    rulesetVersions: [],
  };
}

describe('Simulation routes', () => {
  describe('POST /api/simulate', () => {
    it('simulates fixes for all actionable findings by snapshotId', async () => {
      const state = baseState();
      const app = createApp(state);

      const response = await app.request('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotId: SNAPSHOT_ID }),
      });

      expect(response.status).toBe(200);
      const json = (await response.json()) as {
        domain: string;
        proposedChanges: Array<{
          action: string;
          name: string;
          type: string;
          findingType: string;
        }>;
        summary: {
          changesProposed: number;
          findingsResolved: number;
        };
        resolvedFindings: Array<{ type: string }>;
      };

      expect(json.domain).toBe('example.com');
      expect(json.proposedChanges.length).toBeGreaterThan(0);

      // Should propose SPF fix
      const spfChange = json.proposedChanges.find((c) => c.findingType === 'mail.no-spf-record');
      expect(spfChange).toBeDefined();
      expect(spfChange?.action).toBe('add');
      expect(spfChange?.type).toBe('TXT');

      // Should propose DMARC fix
      const dmarcChange = json.proposedChanges.find(
        (c) => c.findingType === 'mail.no-dmarc-record'
      );
      expect(dmarcChange).toBeDefined();

      // Should resolve those findings
      expect(json.summary.findingsResolved).toBeGreaterThan(0);
    });

    it('simulates a single finding by findingId', async () => {
      const state = baseState();
      const app = createApp(state);

      const response = await app.request('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ findingId: FINDING_ID }),
      });

      expect(response.status).toBe(200);
      const json = (await response.json()) as {
        proposedChanges: Array<{ findingType: string }>;
      };

      // Only SPF change should be proposed (single finding mode)
      expect(json.proposedChanges.length).toBe(1);
      expect(json.proposedChanges[0].findingType).toBe('mail.no-spf-record');
    });

    it('accepts specific findingTypes filter', async () => {
      const state = baseState();
      const app = createApp(state);

      const response = await app.request('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snapshotId: SNAPSHOT_ID,
          findingTypes: ['mail.no-dmarc-record'],
        }),
      });

      expect(response.status).toBe(200);
      const json = (await response.json()) as {
        proposedChanges: Array<{ findingType: string }>;
      };

      expect(json.proposedChanges.length).toBe(1);
      expect(json.proposedChanges[0].findingType).toBe('mail.no-dmarc-record');
    });

    it('returns 404 for missing finding', async () => {
      const state = baseState();
      const app = createApp(state);

      const response = await app.request('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          findingId: 'nonexistent-finding-id',
        }),
      });

      expect(response.status).toBe(404);
    });

    it('returns 404 for missing snapshot', async () => {
      const state = baseState();
      state.snapshots = [];
      const app = createApp(state);

      const response = await app.request('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotId: 'nonexistent-snapshot-id' }),
      });

      expect(response.status).toBe(404);
    });

    it('returns 400 when neither snapshotId nor findingId provided', async () => {
      const state = baseState();
      const app = createApp(state);

      const response = await app.request('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
    });

    it('includes provider detection in result', async () => {
      const state = baseState();
      const app = createApp(state);

      const response = await app.request('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotId: SNAPSHOT_ID }),
      });

      expect(response.status).toBe(200);
      const json = (await response.json()) as {
        detectedProvider: string;
      };
      expect(json.detectedProvider).toBeDefined();
    });

    it('returns diff between current and projected findings', async () => {
      const state = baseState();
      const app = createApp(state);

      const response = await app.request('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotId: SNAPSHOT_ID }),
      });

      expect(response.status).toBe(200);
      const json = (await response.json()) as {
        currentFindings: Array<{ type: string }>;
        projectedFindings: Array<{ type: string }>;
        resolvedFindings: Array<{ type: string }>;
        remainingFindings: Array<{ type: string }>;
        newFindings: Array<{ type: string }>;
        summary: {
          findingsBefore: number;
          findingsAfter: number;
        };
      };

      expect(json.currentFindings).toBeDefined();
      expect(json.projectedFindings).toBeDefined();
      expect(json.resolvedFindings).toBeDefined();
      expect(json.remainingFindings).toBeDefined();
      expect(json.newFindings).toBeDefined();
      expect(json.summary.findingsBefore).toBeGreaterThan(0);
    });
  });

  describe('GET /api/simulate/actionable-types', () => {
    it('returns list of actionable finding types', async () => {
      const state = baseState();
      const app = createApp(state);

      const response = await app.request('/api/simulate/actionable-types');

      expect(response.status).toBe(200);
      const json = (await response.json()) as {
        actionableTypes: Array<{
          type: string;
          description: string;
          risk: string;
        }>;
      };

      expect(json.actionableTypes.length).toBeGreaterThan(0);
      expect(json.actionableTypes.find((t) => t.type === 'mail.no-spf-record')).toBeDefined();
      expect(json.actionableTypes.find((t) => t.type === 'mail.no-dmarc-record')).toBeDefined();
    });
  });
});
