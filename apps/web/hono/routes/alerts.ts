/**
 * Alert Routes - Bead 20: Alerts and shared reports
 *
 * API routes for alert rules, alert management, suppressions, and shared reports.
 *
 * Invariants:
 * - Monitoring respects a defined noise budget
 * - Alerts do not bypass review-only safeguards
 * - Shared reports do not leak internal notes or imply unmanaged-zone completeness
 */

import { AlertRepository } from '@dns-ops/db';
import { Hono } from 'hono';
import { requireAuth } from '../middleware/authorization.js';
import type { Env } from '../types.js';

export const alertRoutes = new Hono<Env>();

// =============================================================================
// MIDDLEWARE - All routes require authentication
// =============================================================================

alertRoutes.use('*', requireAuth);

// =============================================================================
// ALERTS
// =============================================================================

/**
 * GET /api/alerts
 * List alerts with filtering
 */
alertRoutes.get('/', async (c) => {
  const db = c.get('db');
  const tenantId = c.get('tenantId');

  const status = c.req.query('status') as
    | 'pending'
    | 'sent'
    | 'acknowledged'
    | 'resolved'
    | undefined;
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);

  const alertRepo = new AlertRepository(db);

  let alerts = await alertRepo.findPending(tenantId ?? undefined);

  // Filter by status if provided
  if (status) {
    alerts = alerts.filter((a) => a.status === status);
  }

  // Apply limit
  alerts = alerts.slice(0, limit);

  return c.json({ alerts });
});

/**
 * POST /api/alerts/:id/acknowledge
 * Acknowledge an alert
 */
alertRoutes.post('/:id/acknowledge', async (c) => {
  const db = c.get('db');
  const alertId = c.req.param('id');
  const actorId = c.get('actorId');

  if (!actorId) {
    return c.json({ error: 'Actor ID required' }, 401);
  }

  const alertRepo = new AlertRepository(db);
  const alert = await alertRepo.acknowledge(alertId, actorId);

  if (!alert) {
    return c.json({ error: 'Alert not found' }, 404);
  }

  return c.json({ alert });
});

/**
 * POST /api/alerts/:id/resolve
 * Resolve an alert
 */
alertRoutes.post('/:id/resolve', async (c) => {
  const db = c.get('db');
  const alertId = c.req.param('id');

  const body = await c.req.json().catch(() => ({}));
  const resolutionNote = body.resolutionNote as string | undefined;

  const alertRepo = new AlertRepository(db);
  const alert = await alertRepo.resolve(alertId, resolutionNote);

  if (!alert) {
    return c.json({ error: 'Alert not found' }, 404);
  }

  return c.json({ alert });
});

/**
 * POST /api/alerts/:id/suppress
 * Suppress an alert
 */
alertRoutes.post('/:id/suppress', async (c) => {
  const db = c.get('db');
  const alertId = c.req.param('id');

  const alertRepo = new AlertRepository(db);
  const alert = await alertRepo.updateStatus(alertId, 'suppressed');

  if (!alert) {
    return c.json({ error: 'Alert not found' }, 404);
  }

  return c.json({ alert });
});

// =============================================================================
// SHARED REPORTS (Stub for Bead 20)
// =============================================================================

/**
 * GET /api/alerts/reports
 * List shared reports for tenant
 *
 * Note: Full implementation requires SharedReportRepository
 */
alertRoutes.get('/reports', async (c) => {
  // Stub - returns empty list until full implementation
  return c.json({ reports: [] });
});

/**
 * POST /api/alerts/reports
 * Create a new shared report
 *
 * Note: Full implementation requires SharedReportRepository
 */
alertRoutes.post('/reports', async (c) => {
  const body = await c.req.json().catch(() => ({}));

  // Stub - returns placeholder until full implementation
  return c.json(
    {
      report: {
        id: 'stub-report-id',
        title: body.title || 'Untitled Report',
        status: 'generating',
        createdAt: new Date().toISOString(),
      },
    },
    201
  );
});
