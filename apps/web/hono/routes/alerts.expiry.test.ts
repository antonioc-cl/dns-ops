/**
 * Alert Routes - Shared Report Expiry Tests
 * Task AUTH-005: Enforce shared report expiry and status on token route
 *
 * Tests that GET /reports/shared/:token properly checks status and expiresAt
 */

import type { IDatabaseAdapter } from '@dns-ops/db';
import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import type { Env } from '../types.js';
import { alertRoutes } from './alerts.js';

interface MockState {
  sharedReports: Array<Record<string, unknown>>;
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
      if (tableName === 'shared_reports') {
        return [...state.sharedReports];
      }
      return [];
    }),
    selectWhere: vi.fn(),
    selectOne: vi.fn(async (table: unknown, condition: unknown) => {
      const tableName = getTableName(table);
      const param = getConditionParam(condition);
      if (tableName === 'shared_reports') {
        return state.sharedReports.find((row) => row.id === param);
      }
      return undefined;
    }),
    insert: vi.fn(),
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

function createApp(state: MockState) {
  const app = new Hono<Env>();
  app.use('*', async (c, next) => {
    c.set('db', createMockDb(state));
    // No auth context - shared reports are public
    await next();
  });
  app.route('/api/alerts', alertRoutes);
  return app;
}

describe('GET /api/alerts/reports/shared/:token - expiry and status checks', () => {
  it('(1) Valid token, status ready, not expired → 200', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const state: MockState = {
      sharedReports: [
        {
          id: 'report-1',
          tenantId: 'tenant-1',
          createdBy: 'actor-1',
          title: 'Valid Report',
          visibility: 'shared',
          status: 'ready',
          shareToken: 'valid-token',
          expiresAt: tomorrow,
          summary: { totalMonitored: 1, activeAlerts: 0, bySeverity: {} },
          alertSummary: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };
    const app = createApp(state);

    const response = await app.request('/api/alerts/reports/shared/valid-token');

    expect(response.status).toBe(200);
    const json = (await response.json()) as { report: Record<string, unknown> };
    expect(json.report.title).toBe('Valid Report');
  });

  it('(2) Valid token, status expired → 410', async () => {
    const state: MockState = {
      sharedReports: [
        {
          id: 'report-expired',
          tenantId: 'tenant-1',
          createdBy: 'actor-1',
          title: 'Expired Report',
          visibility: 'shared',
          status: 'expired',
          shareToken: 'expired-status-token',
          expiresAt: null,
          summary: { totalMonitored: 0, activeAlerts: 0, bySeverity: {} },
          alertSummary: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };
    const app = createApp(state);

    const response = await app.request('/api/alerts/reports/shared/expired-status-token');

    expect(response.status).toBe(410);
    const json = (await response.json()) as { error: string };
    expect(json.error).toContain('expired');
  });

  it('(3) Valid token, error status → 410', async () => {
    const state: MockState = {
      sharedReports: [
        {
          id: 'report-error',
          tenantId: 'tenant-1',
          createdBy: 'actor-1',
          title: 'Error Report',
          visibility: 'shared',
          status: 'error',
          shareToken: 'error-token',
          expiresAt: null,
          summary: { totalMonitored: 0, activeAlerts: 0, bySeverity: {} },
          alertSummary: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };
    const app = createApp(state);

    const response = await app.request('/api/alerts/reports/shared/error-token');

    expect(response.status).toBe(410);
    const json = (await response.json()) as { error: string };
    expect(json.error).toBeDefined();
  });

  it('(4) Valid token, expiresAt in past → 410', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const state: MockState = {
      sharedReports: [
        {
          id: 'report-past',
          tenantId: 'tenant-1',
          createdBy: 'actor-1',
          title: 'Past Expiry Report',
          visibility: 'shared',
          status: 'ready',
          shareToken: 'past-expiry-token',
          expiresAt: yesterday,
          summary: { totalMonitored: 0, activeAlerts: 0, bySeverity: {} },
          alertSummary: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };
    const app = createApp(state);

    const response = await app.request('/api/alerts/reports/shared/past-expiry-token');

    expect(response.status).toBe(410);
    const json = (await response.json()) as { error: string };
    expect(json.error).toContain('expired');
  });

  it('(5) Invalid token → 404', async () => {
    const state: MockState = {
      sharedReports: [],
    };
    const app = createApp(state);

    const response = await app.request('/api/alerts/reports/shared/nonexistent-token');

    expect(response.status).toBe(404);
    const json = (await response.json()) as { error: string };
    expect(json.error).toContain('not found');
  });
});
