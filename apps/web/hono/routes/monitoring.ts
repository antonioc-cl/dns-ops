/**
 * Monitoring Routes - dns-ops-1j4.12.4
 *
 * API routes for managing monitored domains.
 * Provides CRUD operations for the monitoring configuration.
 */

import { DomainRepository, MonitoredDomainRepository } from '@dns-ops/db';
import { Hono } from 'hono';
import { requireAuth } from '../middleware/authorization.js';
import type { Env } from '../types.js';

export const monitoringRoutes = new Hono<Env>();

// All routes require authentication
monitoringRoutes.use('*', requireAuth);

// =============================================================================
// MONITORED DOMAINS CRUD
// =============================================================================

/**
 * GET /api/monitoring/domains
 * List monitored domains for the current tenant
 */
monitoringRoutes.get('/domains', async (c) => {
  const db = c.get('db');
  const tenantId = c.get('tenantId') || 'default';

  const repo = new MonitoredDomainRepository(db);
  const domainRepo = new DomainRepository(db);

  const monitoredDomains = await repo.findByTenant(tenantId);

  // Enrich with domain names
  const domainsWithNames = await Promise.all(
    monitoredDomains.map(async (md) => {
      const domain = await domainRepo.findById(md.domainId);
      return {
        ...md,
        domainName: domain?.name || 'Unknown',
      };
    })
  );

  return c.json({ monitoredDomains: domainsWithNames });
});

/**
 * GET /api/monitoring/domains/:id
 * Get a specific monitored domain configuration
 */
monitoringRoutes.get('/domains/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const repo = new MonitoredDomainRepository(db);
  const domainRepo = new DomainRepository(db);

  // Try to find by ID first
  const monitoredDomain = await repo.findByDomainId(id);

  if (!monitoredDomain) {
    return c.json({ error: 'Monitored domain not found' }, 404);
  }

  const domain = await domainRepo.findById(monitoredDomain.domainId);

  return c.json({
    monitoredDomain: {
      ...monitoredDomain,
      domainName: domain?.name || 'Unknown',
    },
  });
});

/**
 * POST /api/monitoring/domains
 * Create a new monitored domain configuration
 */
monitoringRoutes.post('/domains', async (c) => {
  const db = c.get('db');
  const tenantId = c.get('tenantId') || 'default';
  const actorId = c.get('actorId') || 'system';

  const body = (await c.req.json().catch(() => ({}))) as {
    domainId?: string;
    domainName?: string;
    schedule?: 'hourly' | 'daily' | 'weekly';
    alertChannels?: {
      email?: string[];
      webhook?: string;
      slack?: string;
    };
    maxAlertsPerDay?: number;
    suppressionWindowMinutes?: number;
  };

  // Validate required fields
  if (!body.domainId && !body.domainName) {
    return c.json({ error: 'Either domainId or domainName is required' }, 400);
  }

  const domainRepo = new DomainRepository(db);
  const repo = new MonitoredDomainRepository(db);

  // Find or create domain
  let domainId = body.domainId;
  if (!domainId && body.domainName) {
    let domain = await domainRepo.findByName(body.domainName);
    if (!domain) {
      // Create the domain
      domain = await domainRepo.create({
        name: body.domainName,
        normalizedName: body.domainName.toLowerCase(),
        tenantId,
        zoneManagement: 'unknown',
      });
    }
    domainId = domain.id;
  }

  if (!domainId) {
    return c.json({ error: 'Could not resolve domain' }, 400);
  }

  // Check if already monitored
  const existing = await repo.findByDomainId(domainId);
  if (existing) {
    return c.json(
      {
        error: 'Domain is already being monitored',
        existingId: existing.id,
      },
      409
    );
  }

  // Create monitored domain
  const monitoredDomain = await repo.create({
    domainId,
    schedule: body.schedule || 'daily',
    alertChannels: body.alertChannels || {},
    maxAlertsPerDay: body.maxAlertsPerDay ?? 5,
    suppressionWindowMinutes: body.suppressionWindowMinutes ?? 60,
    isActive: true,
    createdBy: actorId,
    tenantId,
  });

  return c.json({ monitoredDomain }, 201);
});

/**
 * PUT /api/monitoring/domains/:id
 * Update a monitored domain configuration
 */
monitoringRoutes.put('/domains/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const body = (await c.req.json().catch(() => ({}))) as {
    schedule?: 'hourly' | 'daily' | 'weekly';
    alertChannels?: {
      email?: string[];
      webhook?: string;
      slack?: string;
    };
    maxAlertsPerDay?: number;
    suppressionWindowMinutes?: number;
    isActive?: boolean;
  };

  const repo = new MonitoredDomainRepository(db);

  // Find the monitored domain (either by monitoring ID or domain ID)
  let monitoredDomain = await repo.findByDomainId(id);

  // If not found by domainId, the id might be the monitoring record id itself
  if (!monitoredDomain) {
    const allDomains = await repo.findByTenant(c.get('tenantId') || 'default');
    monitoredDomain = allDomains.find((md) => md.id === id);
  }

  if (!monitoredDomain) {
    return c.json({ error: 'Monitored domain not found' }, 404);
  }

  const updated = await repo.update(monitoredDomain.id, {
    ...(body.schedule && { schedule: body.schedule }),
    ...(body.alertChannels && { alertChannels: body.alertChannels }),
    ...(body.maxAlertsPerDay !== undefined && { maxAlertsPerDay: body.maxAlertsPerDay }),
    ...(body.suppressionWindowMinutes !== undefined && {
      suppressionWindowMinutes: body.suppressionWindowMinutes,
    }),
    ...(body.isActive !== undefined && { isActive: body.isActive }),
  });

  return c.json({ monitoredDomain: updated });
});

/**
 * DELETE /api/monitoring/domains/:id
 * Remove a domain from monitoring
 */
monitoringRoutes.delete('/domains/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const repo = new MonitoredDomainRepository(db);

  // Find the monitored domain
  let monitoredDomain = await repo.findByDomainId(id);

  if (!monitoredDomain) {
    const allDomains = await repo.findByTenant(c.get('tenantId') || 'default');
    monitoredDomain = allDomains.find((md) => md.id === id);
  }

  if (!monitoredDomain) {
    return c.json({ error: 'Monitored domain not found' }, 404);
  }

  await repo.delete(monitoredDomain.id);

  return c.json({ success: true, deletedId: monitoredDomain.id });
});

/**
 * POST /api/monitoring/domains/:id/toggle
 * Toggle active state of a monitored domain
 */
monitoringRoutes.post('/domains/:id/toggle', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const repo = new MonitoredDomainRepository(db);

  let monitoredDomain = await repo.findByDomainId(id);

  if (!monitoredDomain) {
    const allDomains = await repo.findByTenant(c.get('tenantId') || 'default');
    monitoredDomain = allDomains.find((md) => md.id === id);
  }

  if (!monitoredDomain) {
    return c.json({ error: 'Monitored domain not found' }, 404);
  }

  const updated = await repo.update(monitoredDomain.id, {
    isActive: !monitoredDomain.isActive,
  });

  return c.json({ monitoredDomain: updated });
});
