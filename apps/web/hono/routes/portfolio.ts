/**
 * Portfolio Routes - Bead 14
 *
 * API endpoints for portfolio search, domain notes/tags,
 * saved filters, and template management.
 */

import { Hono } from 'hono';
import type { Env } from '../types';
import {
  DomainRepository,
  DomainNoteRepository,
  DomainTagRepository,
  SavedFilterRepository,
  AuditEventRepository,
  TemplateOverrideRepository,
} from '@dns-ops/db/repos';
import { like, and, eq, or, inArray, desc } from 'drizzle-orm';
import { domains, findings, snapshots } from '@dns-ops/db/schema';

export const portfolioRoutes = new Hono<Env>();

// =============================================================================
// PORTFOLIO SEARCH
// =============================================================================

portfolioRoutes.post('/search', async (c) => {
  const db = c.get('db');
  const tenantId = c.get('tenantId') || 'default';
  const body = await c.req.json().catch(() => ({}));
  const {
    query,
    tags,
    severities,
    zoneManagement,
    limit = 20,
    offset = 0,
  } = body;

  try {
    const domainRepo = new DomainRepository(db);
    const tagRepo = new DomainTagRepository(db);

    // Build conditions
    const conditions = [eq(domains.tenantId, tenantId)];

    if (query) {
      conditions.push(
        or(
          like(domains.name, `%${query}%`),
          like(domains.normalizedName, `%${query}%`)
        )
      );
    }

    if (zoneManagement?.length > 0) {
      conditions.push(inArray(domains.zoneManagement, zoneManagement));
    }

    // Get domains
    let domainIds: string[] = [];
    
    if (tags?.length > 0) {
      // Filter by tags first
      domainIds = await tagRepo.findDomainsByTags(tags, tenantId);
      if (domainIds.length === 0) {
        return c.json({ domains: [], total: 0 });
      }
      conditions.push(inArray(domains.id, domainIds));
    }

    // Fetch matching domains
    const results = await db.query.domains.findMany({
      where: and(...conditions),
      limit,
      offset,
      orderBy: desc(domains.updatedAt),
    });

    // Get findings for severity filtering
    const filteredDomains = await Promise.all(
      results.map(async (domain) => {
        const latestSnapshot = await db.query.snapshots.findFirst({
          where: eq(snapshots.domainId, domain.id),
          orderBy: desc(snapshots.createdAt),
        });

        if (!latestSnapshot) {
          return { ...domain, findings: [], latestSnapshot: null };
        }

        const domainFindings = await db.query.findings.findMany({
          where: and(
            eq(findings.snapshotId, latestSnapshot.id),
            severities?.length > 0 ? inArray(findings.severity, severities) : undefined
          ),
        });

        // Filter out if severity filter doesn't match
        if (severities?.length > 0 && domainFindings.length === 0) {
          return null;
        }

        return {
          ...domain,
          findings: domainFindings,
          latestSnapshot,
        };
      })
    );

    const domainResults = filteredDomains.filter(Boolean);

    return c.json({
      domains: domainResults,
      total: domainResults.length,
      limit,
      offset,
    });

  } catch (error) {
    console.error('Portfolio search error:', error);
    return c.json({ error: 'Search failed' }, 500);
  }
});

// =============================================================================
// DOMAIN NOTES
// =============================================================================

portfolioRoutes.get('/domains/:domainId/notes', async (c) => {
  const db = c.get('db');
  const domainId = c.req.param('domainId');

  try {
    const noteRepo = new DomainNoteRepository(db);
    const notes = await noteRepo.findByDomainId(domainId);
    return c.json({ notes });
  } catch (error) {
    return c.json({ error: 'Failed to fetch notes' }, 500);
  }
});

portfolioRoutes.post('/domains/:domainId/notes', async (c) => {
  const db = c.get('db');
  const tenantId = c.get('tenantId') || 'default';
  const actorId = c.get('actorId') || 'unknown';
  const domainId = c.req.param('domainId');
  const body = await c.req.json().catch(() => ({}));
  const { content } = body;

  if (!content?.trim()) {
    return c.json({ error: 'Content is required' }, 400);
  }

  try {
    const noteRepo = new DomainNoteRepository(db);
    const auditRepo = new AuditEventRepository(db);

    const note = await noteRepo.create({
      domainId,
      content: content.trim(),
      createdBy: actorId,
      tenantId,
    });

    await auditRepo.create({
      action: 'domain_note_created',
      entityType: 'domain_note',
      entityId: note.id,
      newValue: { content: note.content },
      actorId,
      tenantId,
      ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent'),
    });

    return c.json({ note }, 201);
  } catch (error) {
    return c.json({ error: 'Failed to create note' }, 500);
  }
});

portfolioRoutes.put('/notes/:noteId', async (c) => {
  const db = c.get('db');
  const tenantId = c.get('tenantId') || 'default';
  const actorId = c.get('actorId') || 'unknown';
  const noteId = c.req.param('noteId');
  const body = await c.req.json().catch(() => ({}));
  const { content } = body;

  try {
    const noteRepo = new DomainNoteRepository(db);
    const auditRepo = new AuditEventRepository(db);

    const existing = await noteRepo.findById(noteId);
    if (!existing) {
      return c.json({ error: 'Note not found' }, 404);
    }

    const updated = await noteRepo.update(noteId, { content });

    await auditRepo.create({
      action: 'domain_note_updated',
      entityType: 'domain_note',
      entityId: noteId,
      previousValue: { content: existing.content },
      newValue: { content: updated.content },
      actorId,
      tenantId,
    });

    return c.json({ note: updated });
  } catch (error) {
    return c.json({ error: 'Failed to update note' }, 500);
  }
});

portfolioRoutes.delete('/notes/:noteId', async (c) => {
  const db = c.get('db');
  const tenantId = c.get('tenantId') || 'default';
  const actorId = c.get('actorId') || 'unknown';
  const noteId = c.req.param('noteId');

  try {
    const noteRepo = new DomainNoteRepository(db);
    const auditRepo = new AuditEventRepository(db);

    const existing = await noteRepo.findById(noteId);
    if (!existing) {
      return c.json({ error: 'Note not found' }, 404);
    }

    await noteRepo.delete(noteId);

    await auditRepo.create({
      action: 'domain_note_deleted',
      entityType: 'domain_note',
      entityId: noteId,
      previousValue: { content: existing.content },
      actorId,
      tenantId,
    });

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to delete note' }, 500);
  }
});

// =============================================================================
// DOMAIN TAGS
// =============================================================================

portfolioRoutes.get('/domains/:domainId/tags', async (c) => {
  const db = c.get('db');
  const domainId = c.req.param('domainId');

  try {
    const tagRepo = new DomainTagRepository(db);
    const tags = await tagRepo.findByDomainId(domainId);
    return c.json({ tags });
  } catch (error) {
    return c.json({ error: 'Failed to fetch tags' }, 500);
  }
});

portfolioRoutes.post('/domains/:domainId/tags', async (c) => {
  const db = c.get('db');
  const tenantId = c.get('tenantId') || 'default';
  const actorId = c.get('actorId') || 'unknown';
  const domainId = c.req.param('domainId');
  const body = await c.req.json().catch(() => ({}));
  const { tag } = body;

  if (!tag?.trim()) {
    return c.json({ error: 'Tag is required' }, 400);
  }

  const normalizedTag = tag.trim().toLowerCase();

  try {
    const tagRepo = new DomainTagRepository(db);
    const auditRepo = new AuditEventRepository(db);

    const created = await tagRepo.create({
      domainId,
      tag: normalizedTag,
      createdBy: actorId,
      tenantId,
    });

    await auditRepo.create({
      action: 'domain_tag_added',
      entityType: 'domain_tag',
      entityId: created.id,
      newValue: { tag: normalizedTag },
      actorId,
      tenantId,
    });

    return c.json({ tag: created }, 201);
  } catch (error) {
    return c.json({ error: 'Failed to add tag' }, 500);
  }
});

portfolioRoutes.delete('/domains/:domainId/tags/:tag', async (c) => {
  const db = c.get('db');
  const tenantId = c.get('tenantId') || 'default';
  const actorId = c.get('actorId') || 'unknown';
  const domainId = c.req.param('domainId');
  const tag = decodeURIComponent(c.req.param('tag'));

  try {
    const tagRepo = new DomainTagRepository(db);
    const auditRepo = new AuditEventRepository(db);

    await tagRepo.deleteByDomainAndTag(domainId, tag.toLowerCase());

    await auditRepo.create({
      action: 'domain_tag_removed',
      entityType: 'domain_tag',
      entityId: domainId,
      previousValue: { tag },
      actorId,
      tenantId,
    });

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to remove tag' }, 500);
  }
});

// =============================================================================
// SAVED FILTERS
// =============================================================================

portfolioRoutes.get('/filters', async (c) => {
  const db = c.get('db');
  const tenantId = c.get('tenantId') || 'default';
  const actorId = c.get('actorId');

  try {
    const filterRepo = new SavedFilterRepository(db);
    const filters = await filterRepo.findByTenant(tenantId, actorId);
    return c.json({ filters });
  } catch (error) {
    return c.json({ error: 'Failed to fetch filters' }, 500);
  }
});

portfolioRoutes.post('/filters', async (c) => {
  const db = c.get('db');
  const tenantId = c.get('tenantId') || 'default';
  const actorId = c.get('actorId') || 'unknown';
  const body = await c.req.json().catch(() => ({}));
  const { name, description, criteria, isShared } = body;

  if (!name?.trim()) {
    return c.json({ error: 'Filter name is required' }, 400);
  }

  try {
    const filterRepo = new SavedFilterRepository(db);
    const auditRepo = new AuditEventRepository(db);

    const filter = await filterRepo.create({
      name: name.trim(),
      description,
      criteria: criteria || {},
      isShared: isShared || false,
      createdBy: actorId,
      tenantId,
    });

    await auditRepo.create({
      action: 'filter_created',
      entityType: 'saved_filter',
      entityId: filter.id,
      newValue: { name: filter.name, criteria: filter.criteria },
      actorId,
      tenantId,
    });

    return c.json({ filter }, 201);
  } catch (error) {
    return c.json({ error: 'Failed to create filter' }, 500);
  }
});

portfolioRoutes.put('/filters/:filterId', async (c) => {
  const db = c.get('db');
  const tenantId = c.get('tenantId') || 'default';
  const actorId = c.get('actorId') || 'unknown';
  const filterId = c.req.param('filterId');
  const body = await c.req.json().catch(() => ({}));

  try {
    const filterRepo = new SavedFilterRepository(db);
    const auditRepo = new AuditEventRepository(db);

    const existing = await filterRepo.findById(filterId);
    if (!existing) {
      return c.json({ error: 'Filter not found' }, 404);
    }

    if (existing.createdBy !== actorId) {
      return c.json({ error: 'Cannot edit filter created by another user' }, 403);
    }

    const updated = await filterRepo.update(filterId, body);

    await auditRepo.create({
      action: 'filter_updated',
      entityType: 'saved_filter',
      entityId: filterId,
      previousValue: { name: existing.name, criteria: existing.criteria },
      newValue: { name: updated.name, criteria: updated.criteria },
      actorId,
      tenantId,
    });

    return c.json({ filter: updated });
  } catch (error) {
    return c.json({ error: 'Failed to update filter' }, 500);
  }
});

portfolioRoutes.delete('/filters/:filterId', async (c) => {
  const db = c.get('db');
  const tenantId = c.get('tenantId') || 'default';
  const actorId = c.get('actorId') || 'unknown';
  const filterId = c.req.param('filterId');

  try {
    const filterRepo = new SavedFilterRepository(db);
    const auditRepo = new AuditEventRepository(db);

    const existing = await filterRepo.findById(filterId);
    if (!existing) {
      return c.json({ error: 'Filter not found' }, 404);
    }

    await filterRepo.delete(filterId);

    await auditRepo.create({
      action: 'filter_deleted',
      entityType: 'saved_filter',
      entityId: filterId,
      previousValue: { name: existing.name },
      actorId,
      tenantId,
    });

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to delete filter' }, 500);
  }
});

// =============================================================================
// TEMPLATE OVERRIDES
// =============================================================================

portfolioRoutes.get('/templates/overrides', async (c) => {
  const db = c.get('db');
  const tenantId = c.get('tenantId') || 'default';
  const providerKey = c.req.query('provider');

  try {
    const overrideRepo = new TemplateOverrideRepository(db);
    const overrides = providerKey
      ? await overrideRepo.findByProvider(providerKey, tenantId)
      : [];
    return c.json({ overrides });
  } catch (error) {
    return c.json({ error: 'Failed to fetch overrides' }, 500);
  }
});

portfolioRoutes.post('/templates/overrides', async (c) => {
  const db = c.get('db');
  const tenantId = c.get('tenantId') || 'default';
  const actorId = c.get('actorId') || 'unknown';
  const body = await c.req.json().catch(() => ({}));
  const { providerKey, templateKey, overrideData, appliesToDomains } = body;

  if (!providerKey || !templateKey || !overrideData) {
    return c.json({ error: 'providerKey, templateKey, and overrideData are required' }, 400);
  }

  try {
    const overrideRepo = new TemplateOverrideRepository(db);
    const auditRepo = new AuditEventRepository(db);

    const override = await overrideRepo.create({
      providerKey,
      templateKey,
      overrideData,
      appliesToDomains: appliesToDomains || [],
      createdBy: actorId,
      tenantId,
    });

    await auditRepo.create({
      action: 'template_override_created',
      entityType: 'template_override',
      entityId: override.id,
      newValue: { providerKey, templateKey, overrideData },
      actorId,
      tenantId,
    });

    return c.json({ override }, 201);
  } catch (error) {
    return c.json({ error: 'Failed to create override' }, 500);
  }
});

portfolioRoutes.put('/templates/overrides/:overrideId', async (c) => {
  const db = c.get('db');
  const tenantId = c.get('tenantId') || 'default';
  const actorId = c.get('actorId') || 'unknown';
  const overrideId = c.req.param('overrideId');
  const body = await c.req.json().catch(() => ({}));

  try {
    const overrideRepo = new TemplateOverrideRepository(db);
    const auditRepo = new AuditEventRepository(db);

    const existing = await overrideRepo.findById(overrideId);
    if (!existing) {
      return c.json({ error: 'Override not found' }, 404);
    }

    const updated = await overrideRepo.update(overrideId, body);

    await auditRepo.create({
      action: 'template_override_updated',
      entityType: 'template_override',
      entityId: overrideId,
      previousValue: { overrideData: existing.overrideData },
      newValue: { overrideData: updated.overrideData },
      actorId,
      tenantId,
    });

    return c.json({ override: updated });
  } catch (error) {
    return c.json({ error: 'Failed to update override' }, 500);
  }
});

portfolioRoutes.delete('/templates/overrides/:overrideId', async (c) => {
  const db = c.get('db');
  const tenantId = c.get('tenantId') || 'default';
  const actorId = c.get('actorId') || 'unknown';
  const overrideId = c.req.param('overrideId');

  try {
    const overrideRepo = new TemplateOverrideRepository(db);
    const auditRepo = new AuditEventRepository(db);

    const existing = await overrideRepo.findById(overrideId);
    if (!existing) {
      return c.json({ error: 'Override not found' }, 404);
    }

    await overrideRepo.delete(overrideId);

    await auditRepo.create({
      action: 'template_override_deleted',
      entityType: 'template_override',
      entityId: overrideId,
      previousValue: { providerKey: existing.providerKey, templateKey: existing.templateKey },
      actorId,
      tenantId,
    });

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to delete override' }, 500);
  }
});

// =============================================================================
// AUDIT LOG
// =============================================================================

portfolioRoutes.get('/audit', async (c) => {
  const db = c.get('db');
  const tenantId = c.get('tenantId') || 'default';
  const limit = parseInt(c.req.query('limit') || '50', 10);

  try {
    const auditRepo = new AuditEventRepository(db);
    const events = await auditRepo.findByTenant(tenantId, limit);
    return c.json({ events });
  } catch (error) {
    return c.json({ error: 'Failed to fetch audit log' }, 500);
  }
});
