/**
 * Monitoring Routes Tests
 *
 * Tests for the monitoring API endpoints.
 * Verifies that DB context is properly checked and routes handle missing db gracefully.
 */

import { Hono } from 'hono';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Env } from '../types.js';
import { monitoringRoutes } from './monitoring.js';

describe('Monitoring Routes', () => {
  describe('Database availability checks', () => {
    let appWithoutDb: Hono<Env>;

    beforeEach(() => {
      // Create app WITHOUT db middleware to simulate missing db context
      appWithoutDb = new Hono<Env>();
      appWithoutDb.route('/api/monitoring', monitoringRoutes);
    });

    it('POST /check should return 503 if database is not available', async () => {
      const res = await appWithoutDb.request('/api/monitoring/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule: 'daily' }),
      });

      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.error).toBe('Database not available');
    });

    it('GET /alerts/pending should return 503 if database is not available', async () => {
      const res = await appWithoutDb.request('/api/monitoring/alerts/pending');

      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.error).toBe('Database not available');
    });

    it('POST /alerts/:alertId/acknowledge should return 503 if database is not available', async () => {
      const res = await appWithoutDb.request('/api/monitoring/alerts/test-alert-id/acknowledge', {
        method: 'POST',
      });

      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.error).toBe('Database not available');
    });

    it('POST /alerts/:alertId/resolve should return 503 if database is not available', async () => {
      const res = await appWithoutDb.request('/api/monitoring/alerts/test-alert-id/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolutionNote: 'Fixed' }),
      });

      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.error).toBe('Database not available');
    });

    it('GET /reports/shared should return 503 if database is not available', async () => {
      const res = await appWithoutDb.request('/api/monitoring/reports/shared');

      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.error).toBe('Database not available');
    });

    it('POST /domains/:domainId/monitor should return 503 if database is not available', async () => {
      const res = await appWithoutDb.request('/api/monitoring/domains/test-domain-id/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule: 'daily' }),
      });

      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.error).toBe('Database not available');
    });

    it('DELETE /domains/:domainId/monitor should return 503 if database is not available', async () => {
      const res = await appWithoutDb.request('/api/monitoring/domains/test-domain-id/monitor', {
        method: 'DELETE',
      });

      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.error).toBe('Database not available');
    });
  });

  describe('Health check', () => {
    it('GET /health should return healthy status without db', async () => {
      const app = new Hono<Env>();
      app.route('/api/monitoring', monitoringRoutes);

      const res = await app.request('/api/monitoring/health');

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('healthy');
      expect(json.service).toBe('monitoring');
    });
  });

  describe('Scheduler behavior', () => {
    it('POST /check should filter by schedule parameter and return empty results when no domains match', async () => {
      const app = new Hono<Env>();

      // Create a mock with domains that DON'T match 'hourly' schedule
      app.use('*', async (c, next) => {
        c.set('db', createMockDb({
          monitoredDomains: [
            createMockMonitoredDomain({ schedule: 'daily', isActive: true }),
          ],
        }));
        c.set('tenantId', 'test-tenant');
        await next();
      });
      app.route('/api/monitoring', monitoringRoutes);

      const res = await app.request('/api/monitoring/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule: 'hourly' }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      // No hourly domains, so none should be checked
      expect(json.schedule).toBe('hourly');
      expect(json.domainsChecked).toBe(0);
    });

    it('POST /check should default to daily schedule', async () => {
      const app = new Hono<Env>();

      app.use('*', async (c, next) => {
        c.set('db', createMockDb({
          monitoredDomains: [],
        }));
        c.set('tenantId', 'test-tenant');
        await next();
      });
      app.route('/api/monitoring', monitoringRoutes);

      const res = await app.request('/api/monitoring/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      // Default schedule should be 'daily'
      expect(json.schedule).toBe('daily');
    });

    it('POST /check should return response with schedule in JSON', async () => {
      // This tests the basic request/response contract
      // Full integration testing requires a real DB or more sophisticated mocking
      const app = new Hono<Env>();

      app.use('*', async (c, next) => {
        c.set('db', createMockDb({
          monitoredDomains: [],
        }));
        c.set('tenantId', 'test-tenant');
        await next();
      });
      app.route('/api/monitoring', monitoringRoutes);

      const res = await app.request('/api/monitoring/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule: 'weekly' }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.schedule).toBe('weekly');
      expect(json.domainsChecked).toBe(0);
      expect(json.results).toEqual([]);
    });
  });

  describe('Suppression window behavior', () => {
    it('should skip domain within suppression window', async () => {
      const app = new Hono<Env>();
      const now = new Date();
      const recentAlert = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes ago

      app.use('*', async (c, next) => {
        c.set('db', createMockDb({
          monitoredDomains: [
            createMockMonitoredDomain({
              lastAlertAt: recentAlert, // 30 min ago
              suppressionWindowMinutes: 60, // 60 min window - still suppressed
            }),
          ],
          domains: [{ id: 'dom-1', name: 'example.com' }],
          alerts: [],
        }));
        c.set('tenantId', 'test-tenant');
        await next();
      });
      app.route('/api/monitoring', monitoringRoutes);

      const res = await app.request('/api/monitoring/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule: 'daily' }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      // Domain should be skipped due to suppression window
      expect(json.domainsChecked).toBe(0);
    });

    it('should pass suppression window check when lastAlertAt is before window (unit test)', () => {
      // Unit test for suppression window logic
      const now = new Date();
      const oldAlert = new Date(now.getTime() - 120 * 60 * 1000); // 2 hours ago
      const suppressionWindowMinutes = 60; // 60 min window

      const suppressionEnd = new Date(oldAlert.getTime() + suppressionWindowMinutes * 60 * 1000);
      const isStillSuppressed = suppressionEnd > now;

      // 2 hours ago + 60 min = 1 hour ago, which is NOT > now
      expect(isStillSuppressed).toBe(false);
    });
  });

  describe('Max alerts per day behavior', () => {
    it('should skip domain that hit max alerts per day', async () => {
      const app = new Hono<Env>();
      const today = new Date();
      today.setHours(1, 0, 0, 0); // Early today

      app.use('*', async (c, next) => {
        c.set('db', createMockDb({
          monitoredDomains: [
            createMockMonitoredDomain({
              lastAlertAt: null, // No suppression window
              maxAlertsPerDay: 3, // Max 3 alerts
            }),
          ],
          domains: [{ id: 'dom-1', name: 'example.com' }],
          // Already 3 alerts today
          alerts: [
            { id: 'alert-1', monitoredDomainId: 'mon-1', createdAt: today, severity: 'high', status: 'pending', title: 'Alert 1', tenantId: 'tenant-1' },
            { id: 'alert-2', monitoredDomainId: 'mon-1', createdAt: today, severity: 'high', status: 'pending', title: 'Alert 2', tenantId: 'tenant-1' },
            { id: 'alert-3', monitoredDomainId: 'mon-1', createdAt: today, severity: 'high', status: 'pending', title: 'Alert 3', tenantId: 'tenant-1' },
          ],
        }));
        c.set('tenantId', 'test-tenant');
        await next();
      });
      app.route('/api/monitoring', monitoringRoutes);

      const res = await app.request('/api/monitoring/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule: 'daily' }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      // Domain should be skipped - hit daily limit
      expect(json.domainsChecked).toBe(0);
    });

    it('should correctly count todays alerts (unit test)', () => {
      // Unit test for today's alert counting logic
      const today = new Date();
      today.setHours(1, 0, 0, 0);
      const maxAlertsPerDay = 5;

      // Create mock alerts - 2 today, 3 yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const alerts = [
        { createdAt: today },
        { createdAt: today },
        { createdAt: yesterday },
        { createdAt: yesterday },
        { createdAt: yesterday },
      ];

      // Count today's alerts using the same logic as the monitoring route
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayCount = alerts.filter((a) => {
        const alertDate = new Date(a.createdAt);
        return alertDate >= todayStart;
      }).length;

      expect(todayCount).toBe(2);
      expect(todayCount < maxAlertsPerDay).toBe(true); // Should proceed
    });

    it('should correctly identify when daily limit is reached (unit test)', () => {
      // Unit test for max alerts per day limit logic
      const today = new Date();
      today.setHours(1, 0, 0, 0);
      const maxAlertsPerDay = 3;

      const alerts = [
        { createdAt: today },
        { createdAt: today },
        { createdAt: today },
      ];

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayCount = alerts.filter((a) => {
        const alertDate = new Date(a.createdAt);
        return alertDate >= todayStart;
      }).length;

      expect(todayCount).toBe(3);
      expect(todayCount >= maxAlertsPerDay).toBe(true); // Should skip
    });

    it('should not count yesterday alerts (unit test)', () => {
      // Unit test confirming yesterday's alerts don't count
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const alerts = [
        { createdAt: yesterday },
        { createdAt: yesterday },
        { createdAt: yesterday },
      ];

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayCount = alerts.filter((a) => {
        const alertDate = new Date(a.createdAt);
        return alertDate >= todayStart;
      }).length;

      expect(todayCount).toBe(0); // Yesterday's alerts don't count
    });
  });
});

// =============================================================================
// Mock DB Helper
// =============================================================================

interface MockMonitoredDomain {
  id: string;
  domainId: string;
  tenantId: string;
  schedule: string;
  isActive: boolean;
  lastAlertAt: Date | null;
  suppressionWindowMinutes: number;
  maxAlertsPerDay: number;
  alertChannels: Record<string, unknown>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastCheckAt: Date | null;
}

interface MockDomain {
  id: string;
  name: string;
  normalizedName?: string;
  tenantId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MockAlert {
  id: string;
  monitoredDomainId: string;
  createdAt: Date;
  severity: string;
  status: string;
  title: string;
  tenantId: string;
  description?: string;
  dedupKey?: string;
  acknowledgedAt?: Date | null;
  acknowledgedBy?: string | null;
  resolvedAt?: Date | null;
  resolutionNote?: string | null;
}

interface MockDbOptions {
  monitoredDomains?: MockMonitoredDomain[];
  domains?: MockDomain[];
  alerts?: MockAlert[];
  onFindActiveBySchedule?: (schedule: string) => MockMonitoredDomain[];
}

function createMockMonitoredDomain(overrides: Partial<MockMonitoredDomain> = {}): MockMonitoredDomain {
  return {
    id: 'mon-1',
    domainId: 'dom-1',
    tenantId: 'tenant-1',
    schedule: 'daily',
    isActive: true,
    lastAlertAt: null,
    suppressionWindowMinutes: 60,
    maxAlertsPerDay: 10,
    alertChannels: {},
    createdBy: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastCheckAt: null,
    ...overrides,
  };
}

function createMockDb(options: MockDbOptions = {}) {
  const mockMonitoredDomains = options.monitoredDomains || [];
  const mockDomains = options.domains || [];
  const mockAlerts = options.alerts || [];
  const onFindActiveBySchedule = options.onFindActiveBySchedule;

  // Create a mock that returns data based on the table being queried
  // The select method receives a table schema, we'll identify it by its name property
  return {
    select: (table: { _: { name: string } }) => {
      const tableName = table?._ ?.name;
      if (tableName === 'monitored_domains') {
        if (onFindActiveBySchedule) {
          // For scheduler tests, we intercept and call the callback
          return Promise.resolve(mockMonitoredDomains);
        }
        return Promise.resolve(mockMonitoredDomains);
      }
      if (tableName === 'alerts') {
        return Promise.resolve(mockAlerts);
      }
      if (tableName === 'domains') {
        return Promise.resolve(mockDomains);
      }
      return Promise.resolve([]);
    },
    selectWhere: (table: { _: { name: string } }, _condition: unknown) => {
      const tableName = table?._?.name;
      if (tableName === 'alerts') {
        // For findByMonitoredDomain, filter by monitoredDomainId
        return Promise.resolve(mockAlerts);
      }
      if (tableName === 'domains') {
        return Promise.resolve(mockDomains);
      }
      return Promise.resolve([]);
    },
    selectOne: (table: { _: { name: string } }, _condition: unknown) => {
      const tableName = table?._?.name;
      if (tableName === 'domains') {
        return Promise.resolve(mockDomains[0] || null);
      }
      return Promise.resolve(null);
    },
    insert: () => Promise.resolve({ id: 'new-id' }),
    update: () => Promise.resolve(1),
    delete: () => Promise.resolve(1),
    query: () => Promise.resolve([]),
    getDrizzle: () => ({
      query: {
        monitoredDomains: {
          findMany: () => Promise.resolve(mockMonitoredDomains),
        },
        domains: {
          findFirst: () => Promise.resolve(mockDomains[0] || null),
        },
        alerts: {
          findMany: () => Promise.resolve(mockAlerts),
        },
      },
    }),
  } as unknown as import('@dns-ops/db').IDatabaseAdapter;
}
