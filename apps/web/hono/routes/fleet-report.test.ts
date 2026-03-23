import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { collectorCircuit } from '../lib/collector-proxy.js';
import type { Env } from '../types.js';
import { fleetReportRoutes } from './fleet-report.js';

const originalEnv = process.env;

describe('Fleet report web proxy routes', () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      COLLECTOR_URL: 'http://collector.test',
      INTERNAL_SECRET: 'test-internal-secret',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    collectorCircuit.reset();
  });

  function createApp(withAuth = true) {
    const app = new Hono<Env>();
    app.use('*', async (c, next) => {
      if (withAuth) {
        c.set('tenantId', 'tenant-1');
        c.set('actorId', 'actor-1');
      }
      await next();
    });
    app.route('/api/fleet-report', fleetReportRoutes);
    return app;
  }

  it('requires auth for run endpoint', async () => {
    const app = createApp(false);
    const response = await app.request('/api/fleet-report/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inventory: ['example.com'], checks: ['spf'], format: 'summary' }),
    });

    expect(response.status).toBe(401);
  });

  it('proxies run requests to the collector with service auth headers', async () => {
    const upstreamJson = { reportGeneratedAt: new Date().toISOString(), domainsChecked: 1 };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(upstreamJson), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const app = createApp();
    const response = await app.request('/api/fleet-report/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inventory: ['example.com'], checks: ['spf'], format: 'summary' }),
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith('http://collector.test/api/fleet-report/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': 'test-internal-secret',
        'X-Tenant-Id': 'tenant-1',
        'X-Actor-Id': 'actor-1',
      },
      body: JSON.stringify({ inventory: ['example.com'], checks: ['spf'], format: 'summary' }),
    });
  });

  it('returns 503 when collector integration is missing in production', async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      COLLECTOR_URL: 'http://collector.test',
      INTERNAL_SECRET: '',
    };

    const app = createApp();
    const response = await app.request('/api/fleet-report/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inventory: ['example.com'], checks: ['spf'], format: 'summary' }),
    });

    expect(response.status).toBe(503);
    const json = (await response.json()) as { error?: string };
    expect(json.error).toBe('Collector integration is not configured');
  });

  it('proxies CSV imports to the collector', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ imported: 1, inventory: ['example.com'] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const app = createApp();
    const response = await app.request('/api/fleet-report/import-csv', {
      method: 'POST',
      headers: { 'Content-Type': 'text/csv' },
      body: 'domain\nexample.com\n',
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith('http://collector.test/api/fleet-report/import-csv', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/csv',
        'X-Internal-Secret': 'test-internal-secret',
        'X-Tenant-Id': 'tenant-1',
        'X-Actor-Id': 'actor-1',
      },
      body: 'domain\nexample.com\n',
    });
  });
});
