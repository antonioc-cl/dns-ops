import { Hono } from 'hono';
import { getCollectorProxyConfig } from '../lib/collector-proxy.js';
import { requireAuth, requireWritePermission } from '../middleware/authorization.js';
import type { Env } from '../types.js';

export const fleetReportRoutes = new Hono<Env>();

fleetReportRoutes.use('*', requireAuth);

fleetReportRoutes.post('/run', requireWritePermission, async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return c.json({ error: 'Invalid JSON in request body' }, 400);
  }

  const proxyConfig = getCollectorProxyConfig(c, { contentType: 'application/json' });
  if (proxyConfig instanceof Response) {
    return proxyConfig;
  }

  try {
    const response = await fetch(`${proxyConfig.collectorUrl}/api/fleet-report/run`, {
      method: 'POST',
      headers: proxyConfig.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const upstreamJson = (await response.json().catch(() => null)) as {
        error?: string;
        message?: string;
      } | null;
      return c.json(
        {
          error: upstreamJson?.error || 'Fleet report request failed',
          message: upstreamJson?.message,
        },
        response.status
      );
    }

    return c.json(await response.json());
  } catch (error) {
    console.error('Fleet report proxy error:', error);
    return c.json({ error: 'Failed to connect to collector service' }, 503);
  }
});

fleetReportRoutes.post('/import-csv', async (c) => {
  const body = await c.req.text();
  if (!body.trim()) {
    return c.json({ error: 'CSV data required' }, 400);
  }

  const proxyConfig = getCollectorProxyConfig(c, { contentType: 'text/csv' });
  if (proxyConfig instanceof Response) {
    return proxyConfig;
  }

  try {
    const response = await fetch(`${proxyConfig.collectorUrl}/api/fleet-report/import-csv`, {
      method: 'POST',
      headers: proxyConfig.headers,
      body,
    });

    if (!response.ok) {
      const upstreamJson = (await response.json().catch(() => null)) as {
        error?: string;
        message?: string;
      } | null;
      return c.json(
        {
          error: upstreamJson?.error || 'Fleet report CSV import failed',
          message: upstreamJson?.message,
        },
        response.status
      );
    }

    return c.json(await response.json());
  } catch (error) {
    console.error('Fleet report CSV proxy error:', error);
    return c.json({ error: 'Failed to connect to collector service' }, 503);
  }
});
