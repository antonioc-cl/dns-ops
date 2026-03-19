/**
 * Mail Routes
 *
 * API endpoints for mail diagnostics and remediation requests.
 */

import { createPostgresClient, createSimpleAdapter, RemediationRepository } from '@dns-ops/db';
import { Hono } from 'hono';

interface CollectMailRequest {
  domain?: string;
  preferredProvider?: 'google' | 'microsoft' | 'zoho' | 'other';
  explicitSelectors?: string[];
}

interface RemediationRequest {
  domain?: string;
  snapshotId?: string;
  contactEmail?: string;
  contactName?: string;
  contactPhone?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  issues?: string[];
  notes?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s-]{8,20}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateCollectMail(data: CollectMailRequest): string | null {
  if (!data.domain || data.domain.length > 253) return 'Domain is required';
  if (
    data.preferredProvider &&
    !['google', 'microsoft', 'zoho', 'other'].includes(data.preferredProvider)
  ) {
    return 'Invalid preferredProvider';
  }
  if (data.explicitSelectors && !Array.isArray(data.explicitSelectors)) {
    return 'explicitSelectors must be an array';
  }
  return null;
}

function validateRemediation(data: RemediationRequest): string | null {
  if (!data.domain || data.domain.length > 253) return 'Domain is required';
  if (!data.contactEmail || !EMAIL_RE.test(data.contactEmail)) {
    return 'Valid contactEmail is required';
  }
  if (!data.contactName || data.contactName.trim().length < 2) {
    return 'contactName must be at least 2 characters';
  }
  if (data.snapshotId && !UUID_RE.test(data.snapshotId)) {
    return 'snapshotId must be a UUID';
  }
  if (data.contactPhone && !PHONE_RE.test(data.contactPhone)) {
    return 'Valid phone number required';
  }
  if (data.priority && !['low', 'medium', 'high', 'critical'].includes(data.priority)) {
    return 'Invalid priority';
  }
  if (!data.issues || !Array.isArray(data.issues) || data.issues.length === 0) {
    return 'At least one issue must be selected';
  }
  if (data.notes && data.notes.length > 1000) {
    return 'notes must be <= 1000 chars';
  }
  return null;
}

function getRemediationRepo() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return { error: 'Database not configured' as const };
  }
  const db = createPostgresClient(dbUrl);
  const adapter = createSimpleAdapter(db, 'postgres');
  return { repo: new RemediationRepository(adapter) };
}

export const mailRoutes = new Hono()
  // Trigger mail check via collector
  .post('/collect/mail', async (c) => {
    let data: CollectMailRequest;
    try {
      data = (await c.req.json()) as CollectMailRequest;
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    const validationError = validateCollectMail(data);
    if (validationError) {
      return c.json({ error: validationError }, 400);
    }

    const collectorUrl = process.env.COLLECTOR_URL || 'http://localhost:3001';

    try {
      const response = await fetch(`${collectorUrl}/api/collect/mail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = (await response.json().catch(() => ({}))) as { message?: string };
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
  .post('/remediation', async (c) => {
    let data: RemediationRequest;
    try {
      data = (await c.req.json()) as RemediationRequest;
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    const validationError = validateRemediation(data);
    if (validationError) {
      return c.json({ error: validationError }, 400);
    }

    const db = getRemediationRepo();
    if ('error' in db) {
      return c.json({ error: db.error }, 500);
    }

    try {
      const request = await db.repo.create({
        snapshotId: data.snapshotId,
        domain: data.domain as string,
        contactEmail: data.contactEmail as string,
        contactName: data.contactName as string,
        contactPhone: data.contactPhone,
        issues: data.issues as string[],
        priority: data.priority || 'medium',
        notes: data.notes,
        status: 'open',
      });

      return c.json(
        {
          id: request.id,
          domain: request.domain,
          status: request.status,
          createdAt: request.createdAt,
        },
        201
      );
    } catch (error) {
      console.error('Remediation creation error:', error);
      return c.json(
        {
          error: 'Failed to create remediation request',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  })

  // Get remediation requests for a domain
  .get('/remediation/:domain', async (c) => {
    const domain = c.req.param('domain');
    const db = getRemediationRepo();

    if ('error' in db) {
      return c.json({ error: db.error }, 500);
    }

    try {
      const requests = await db.repo.findByDomain(domain);
      return c.json(requests);
    } catch (error) {
      console.error('Remediation fetch error:', error);
      return c.json(
        {
          error: 'Failed to fetch remediation requests',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  })

  // Update remediation status
  .patch('/remediation/:id', async (c) => {
    const id = c.req.param('id');
    const body = (await c.req.json().catch(() => ({}))) as {
      status?: string;
      assignedTo?: string;
    };
    const { status, assignedTo } = body;

    if (!status || !['open', 'in-progress', 'resolved', 'closed'].includes(status)) {
      return c.json({ error: 'Valid status required' }, 400);
    }

    const nextStatus = status as 'open' | 'in-progress' | 'resolved' | 'closed';

    const db = getRemediationRepo();
    if ('error' in db) {
      return c.json({ error: db.error }, 500);
    }

    try {
      const updated = await db.repo.updateStatus(id, nextStatus, assignedTo);

      if (!updated) {
        return c.json({ error: 'Remediation request not found' }, 404);
      }

      return c.json(updated);
    } catch (error) {
      console.error('Remediation update error:', error);
      return c.json(
        {
          error: 'Failed to update remediation request',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      );
    }
  });
