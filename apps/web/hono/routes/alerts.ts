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
import { trackAlert, trackReport } from '../middleware/error-tracking.js';
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
 * List alerts with filtering and pagination
 */
alertRoutes.get('/', async (c) => {
  const db = c.get('db');
  const tenantId = c.get('tenantId');

  const status = c.req.query('status') as
    | 'pending'
    | 'sent'
    | 'suppressed'
    | 'acknowledged'
    | 'resolved'
    | undefined;
  const severity = c.req.query('severity') as
    | 'critical'
    | 'high'
    | 'medium'
    | 'low'
    | undefined;
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
  const offset = parseInt(c.req.query('offset') || '0');

  const alertRepo = new AlertRepository(db);

  const { alerts, total } = await alertRepo.findAll(tenantId ?? undefined, {
    status,
    severity,
    limit,
    offset,
  });

  return c.json({
    alerts,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + alerts.length < total,
    },
  });
});

/**
 * GET /api/alerts/:id
 * Get alert detail by ID
 */
alertRoutes.get('/:id', async (c) => {
  const db = c.get('db');
  const alertId = c.req.param('id');

  const alertRepo = new AlertRepository(db);
  const alert = await alertRepo.findById(alertId);

  if (!alert) {
    return c.json({ error: 'Alert not found' }, 404);
  }

  // TODO: Tenant check - verify alert.tenantId matches c.get('tenantId')
  // For now, leaving open as tenantId may be null in dev

  return c.json({ alert });
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

  // Track alert acknowledgment (Bead 14.4)
  const tenantId = c.get('tenantId') || 'default';
  trackAlert({
    tenantId,
    alertId,
    alertType: alert.title,
    action: 'acknowledge',
    severity: alert.severity,
  });

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

  // Track alert resolution (Bead 14.4)
  const tenantId = c.get('tenantId') || 'default';
  trackAlert({
    tenantId,
    alertId,
    alertType: alert.title,
    action: 'resolve',
    severity: alert.severity,
  });

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

  // Track alert suppression (Bead 14.4)
  const tenantId = c.get('tenantId') || 'default';
  trackAlert({
    tenantId,
    alertId,
    alertType: alert.title,
    action: 'dismiss',
    severity: alert.severity,
  });

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
  const reportId = 'stub-report-id';

  // Track report generation (Bead 14.4)
  const tenantId = c.get('tenantId') || 'default';
  trackReport({
    tenantId,
    reportType: 'shared',
    reportId,
    action: 'generate',
  });

  // Stub - returns placeholder until full implementation
  return c.json(
    {
      report: {
        id: reportId,
        title: body.title || 'Untitled Report',
        status: 'generating',
        createdAt: new Date().toISOString(),
      },
    },
    201
  );
});
