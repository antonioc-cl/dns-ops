import { Hono } from 'hono';
import { proxyToCollector } from '../lib/collector-proxy.js';
import { requireAuth, requireWritePermission } from '../middleware/authorization.js';
import type { Env } from '../types.js';

export const fleetReportRoutes = new Hono<Env>();

fleetReportRoutes.use('*', requireAuth);

fleetReportRoutes.post('/run', requireWritePermission, async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return c.json({ error: 'Invalid JSON in request body' }, 400);
  }

  const result = await proxyToCollector(c, {
    path: '/api/fleet-report/run',
    method: 'POST',
    body: JSON.stringify(body),
  });

  if (result instanceof Response) return result;
  return c.json(result.json);
});

fleetReportRoutes.post('/import-csv', requireWritePermission, async (c) => {
  const body = await c.req.text();
  if (!body.trim()) {
    return c.json({ error: 'CSV data required' }, 400);
  }

  const result = await proxyToCollector(c, {
    path: '/api/fleet-report/import-csv',
    method: 'POST',
    headers: { 'Content-Type': 'text/csv' },
    body,
  });

  if (result instanceof Response) return result;
  return c.json(result.json);
});
