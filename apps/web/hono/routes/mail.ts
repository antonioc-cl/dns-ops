/**
 * Mail Routes
 *
 * API endpoints for mail diagnostics and remediation requests.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
  RemediationRepository,
  createPostgresClient,
} from '@dns-ops/db';

const remediationSchema = z.object({
  domain: z.string().min(1).max(253),
  snapshotId: z.string().uuid().optional(),
  contactEmail: z.string().email().max(254),
  contactName: z.string().min(2).max(100),
  contactPhone: z.string()
    .regex(/^\+?[\d\s-]{8,20}$/, 'Valid phone number required')
    .optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  issues: z.array(z.string()).min(1, 'At least one issue must be selected'),
  notes: z.string().max(1000).optional(),
});

const collectMailSchema = z.object({
  domain: z.string().min(1).max(253),
  preferredProvider: z.enum(['google', 'microsoft', 'zoho', 'other']).optional(),
  explicitSelectors: z.array(z.string()).optional(),
});

export const mailRoutes = new Hono()
  // Trigger mail check via collector
  .post('/collect/mail', zValidator('json', collectMailSchema), async (c) => {
    const data = c.req.valid('json');

    // Forward to collector service
    const collectorUrl = process.env.COLLECTOR_URL || 'http://localhost:3001';

    try {
      const response = await fetch(`${collectorUrl}/api/collect/mail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        return c.json({ error: error.message || 'Collector error' }, response.status);
      }

      const result = await response.json();
      return c.json(result);
    } catch (error) {
      console.error('Collector connection error:', error);
      return c.json({ error: 'Failed to connect to collector service' }, 503);
    }
  })

  // Create remediation request
  .post('/remediation', zValidator('json', remediationSchema), async (c) => {
    const data = c.req.valid('json');

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return c.json({ error: 'Database not configured' }, 500);
    }

    try {
      const db = createPostgresClient(dbUrl);
      const remediationRepo = new RemediationRepository(db);

      const request = await remediationRepo.create({
        snapshotId: data.snapshotId,
        domain: data.domain,
        contactEmail: data.contactEmail,
        contactName: data.contactName,
        contactPhone: data.contactPhone,
        issues: data.issues,
        priority: data.priority,
        notes: data.notes,
        status: 'open',
      });

      return c.json({
        id: request.id,
        domain: request.domain,
        status: request.status,
        createdAt: request.createdAt,
      }, 201);
    } catch (error) {
      console.error('Remediation creation error:', error);
      return c.json({
        error: 'Failed to create remediation request',
        message: error instanceof Error ? error.message : 'Unknown error',
      }, 500);
    }
  })

  // Get remediation requests for a domain
  .get('/remediation/:domain', async (c) => {
    const domain = c.req.param('domain');

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return c.json({ error: 'Database not configured' }, 500);
    }

    try {
      const db = createPostgresClient(dbUrl);
      const remediationRepo = new RemediationRepository(db);

      const requests = await remediationRepo.findByDomain(domain);

      return c.json(requests);
    } catch (error) {
      console.error('Remediation fetch error:', error);
      return c.json({
        error: 'Failed to fetch remediation requests',
        message: error instanceof Error ? error.message : 'Unknown error',
      }, 500);
    }
  })

  // Update remediation status
  .patch('/remediation/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { status, assignedTo } = body;

    if (!status || !['open', 'in-progress', 'resolved', 'closed'].includes(status)) {
      return c.json({ error: 'Valid status required' }, 400);
    }

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return c.json({ error: 'Database not configured' }, 500);
    }

    try {
      const db = createPostgresClient(dbUrl);
      const remediationRepo = new RemediationRepository(db);

      const updated = await remediationRepo.updateStatus(id, status, assignedTo);

      if (!updated) {
        return c.json({ error: 'Remediation request not found' }, 404);
      }

      return c.json(updated);
    } catch (error) {
      console.error('Remediation update error:', error);
      return c.json({
        error: 'Failed to update remediation request',
        message: error instanceof Error ? error.message : 'Unknown error',
      }, 500);
    }
  });
