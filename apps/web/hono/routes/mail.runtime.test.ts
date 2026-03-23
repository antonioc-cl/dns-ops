/**
 * Mail remediation route tests
 */

import type { IDatabaseAdapter } from '@dns-ops/db';
import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import type { Env } from '../types.js';
import { mailRoutes } from './mail.js';

interface MockState {
  remediationRequests: Array<Record<string, unknown>>;
  auditEvents: Array<Record<string, unknown>>;
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

function createMockDb(state: MockState): IDatabaseAdapter {
  return {
    getDrizzle: vi.fn(),
    select: vi.fn(async (table: unknown) => {
      const tableName = getTableName(table);
      if (tableName === 'remediation_requests') return [...state.remediationRequests];
      if (tableName === 'audit_events') return [...state.auditEvents];
      return [];
    }),
    selectWhere: vi.fn(async (table: unknown) => {
      const tableName = getTableName(table);
      if (tableName === 'remediation_requests') return [...state.remediationRequests];
      if (tableName === 'audit_events') return [...state.auditEvents];
      return [];
    }),
    selectOne: vi.fn(async (table: unknown) => {
      const tableName = getTableName(table);
      if (tableName === 'remediation_requests') return state.remediationRequests[0];
      if (tableName === 'audit_events') return state.auditEvents[0];
      return undefined;
    }),
    insert: vi.fn(async (table: unknown, values: Record<string, unknown>) => {
      const tableName = getTableName(table);
      if (tableName === 'remediation_requests') {
        const row = {
          id: `rem-${state.remediationRequests.length + 1}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          resolvedAt: null,
          assignedTo: null,
          ...values,
        };
        state.remediationRequests.push(row);
        return row;
      }
      if (tableName === 'audit_events') {
        const row = {
          id: `audit-${state.auditEvents.length + 1}`,
          createdAt: new Date(),
          ...values,
        };
        state.auditEvents.push(row);
        return row;
      }
      return values;
    }),
    insertMany: vi.fn(),
    update: vi.fn(),
    updateOne: vi.fn(async (table: unknown, values: Record<string, unknown>) => {
      const tableName = getTableName(table);
      if (tableName !== 'remediation_requests' || state.remediationRequests.length === 0) {
        return undefined;
      }
      state.remediationRequests[0] = {
        ...state.remediationRequests[0],
        ...values,
      };
      return state.remediationRequests[0];
    }),
    delete: vi.fn(),
    deleteOne: vi.fn(),
    transaction: vi.fn(async (callback: (db: IDatabaseAdapter) => Promise<unknown>) =>
      callback(createMockDb(state))
    ),
  } as unknown as IDatabaseAdapter;
}

function createApp(state: MockState, tenantId = 'tenant-1', actorId = 'actor-1') {
  const app = new Hono<Env>();
  app.use('*', async (c, next) => {
    c.set('db', createMockDb(state));
    c.set('tenantId', tenantId);
    c.set('actorId', actorId);
    await next();
  });
  app.route('/api', mailRoutes);
  return app;
}

describe('mailRoutes remediation', () => {
  it('creates a remediation request with tenant and actor attribution', async () => {
    const state: MockState = { remediationRequests: [], auditEvents: [] };
    const app = createApp(state);

    const response = await app.request('/api/remediation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        domain: 'example.com',
        contactEmail: 'ops@example.com',
        contactName: 'Ops User',
        issues: ['spf-missing'],
        priority: 'high',
      }),
    });

    expect(response.status).toBe(201);
    const json = (await response.json()) as { remediation: Record<string, unknown> };
    expect(json.remediation.tenantId).toBe('tenant-1');
    expect(json.remediation.createdBy).toBe('actor-1');
    expect(state.auditEvents).toHaveLength(1);
  });

  it('lists only remediation requests for the requesting tenant', async () => {
    const state: MockState = {
      remediationRequests: [
        {
          id: 'rem-1',
          tenantId: 'tenant-1',
          createdBy: 'actor-1',
          domain: 'example.com',
          contactEmail: 'ops@example.com',
          contactName: 'Ops User',
          issues: ['spf-missing'],
          priority: 'medium',
          status: 'open',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'rem-2',
          tenantId: 'tenant-2',
          createdBy: 'actor-2',
          domain: 'other.com',
          contactEmail: 'ops@other.com',
          contactName: 'Other User',
          issues: ['dmarc-missing'],
          priority: 'high',
          status: 'open',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      auditEvents: [],
    };
    const app = createApp(state);

    const response = await app.request('/api/remediation');

    expect(response.status).toBe(200);
    const json = (await response.json()) as { remediation: Array<Record<string, unknown>> };
    expect(json.remediation).toHaveLength(1);
    expect(json.remediation[0]?.tenantId).toBe('tenant-1');
  });
});
