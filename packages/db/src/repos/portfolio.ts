/**
 * Portfolio Repositories - Bead 14
 *
 * Repositories for domain notes, tags, saved filters, audit events,
 * and template overrides.
 */

import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import type { DbClient } from '../client.js';
import {
  domainNotes,
  domainTags,
  savedFilters,
  auditEvents,
  templateOverrides,
  type NewDomainNote,
  type NewDomainTag,
  type NewSavedFilter,
  type NewAuditEvent,
  type NewTemplateOverride,
  type DomainNote,
  type DomainTag,
  type SavedFilter,
  type AuditEvent,
  type TemplateOverride,
} from '../schema/index.js';

// =============================================================================
// DOMAIN NOTES REPOSITORY
// =============================================================================

export class DomainNoteRepository {
  constructor(private db: DbClient) {}

  async findByDomainId(domainId: string): Promise<DomainNote[]> {
    return this.db.query.domainNotes.findMany({
      where: eq(domainNotes.domainId, domainId),
      orderBy: desc(domainNotes.createdAt),
    });
  }

  async findById(id: string): Promise<DomainNote | undefined> {
    return this.db.query.domainNotes.findFirst({
      where: eq(domainNotes.id, id),
    });
  }

  async create(data: NewDomainNote): Promise<DomainNote> {
    const [note] = await this.db.insert(domainNotes).values(data).returning();
    return note;
  }

  async update(id: string, data: Partial<NewDomainNote>): Promise<DomainNote> {
    const [note] = await this.db
      .update(domainNotes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(domainNotes.id, id))
      .returning();
    return note;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(domainNotes).where(eq(domainNotes.id, id));
  }
}

// =============================================================================
// DOMAIN TAGS REPOSITORY
// =============================================================================

export class DomainTagRepository {
  constructor(private db: DbClient) {}

  async findByDomainId(domainId: string): Promise<DomainTag[]> {
    return this.db.query.domainTags.findMany({
      where: eq(domainTags.domainId, domainId),
      orderBy: desc(domainTags.createdAt),
    });
  }

  async findByTag(tag: string, tenantId?: string): Promise<DomainTag[]> {
    const conditions = [eq(domainTags.tag, tag)];
    if (tenantId) {
      conditions.push(eq(domainTags.tenantId, tenantId));
    }
    return this.db.query.domainTags.findMany({
      where: and(...conditions),
    });
  }

  async findDomainsByTags(tags: string[], tenantId?: string): Promise<string[]> {
    const conditions = [inArray(domainTags.tag, tags)];
    if (tenantId) {
      conditions.push(eq(domainTags.tenantId, tenantId));
    }
    const results = await this.db.query.domainTags.findMany({
      where: and(...conditions),
      columns: { domainId: true },
    });
    return [...new Set(results.map(r => r.domainId))];
  }

  async create(data: NewDomainTag): Promise<DomainTag> {
    const [tag] = await this.db.insert(domainTags).values(data).returning();
    return tag;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(domainTags).where(eq(domainTags.id, id));
  }

  async deleteByDomainAndTag(domainId: string, tag: string): Promise<void> {
    await this.db
      .delete(domainTags)
      .where(and(eq(domainTags.domainId, domainId), eq(domainTags.tag, tag)));
  }
}

// =============================================================================
// SAVED FILTERS REPOSITORY
// =============================================================================

export class SavedFilterRepository {
  constructor(private db: DbClient) {}

  async findByTenant(tenantId: string, userId?: string): Promise<SavedFilter[]> {
    const conditions = [
      eq(savedFilters.tenantId, tenantId),
    ];
    
    if (userId) {
      conditions.push(
        sql`${savedFilters.createdBy} = ${userId} OR ${savedFilters.isShared} = true`
      );
    }
    
    return this.db.query.savedFilters.findMany({
      where: and(...conditions),
      orderBy: desc(savedFilters.updatedAt),
    });
  }

  async findById(id: string): Promise<SavedFilter | undefined> {
    return this.db.query.savedFilters.findFirst({
      where: eq(savedFilters.id, id),
    });
  }

  async create(data: NewSavedFilter): Promise<SavedFilter> {
    const [filter] = await this.db.insert(savedFilters).values(data).returning();
    return filter;
  }

  async update(id: string, data: Partial<NewSavedFilter>): Promise<SavedFilter> {
    const [filter] = await this.db
      .update(savedFilters)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(savedFilters.id, id))
      .returning();
    return filter;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(savedFilters).where(eq(savedFilters.id, id));
  }
}

// =============================================================================
// AUDIT EVENTS REPOSITORY
// =============================================================================

export class AuditEventRepository {
  constructor(private db: DbClient) {}

  async findByEntity(entityType: string, entityId: string): Promise<AuditEvent[]> {
    return this.db.query.auditEvents.findMany({
      where: and(
        eq(auditEvents.entityType, entityType),
        eq(auditEvents.entityId, entityId)
      ),
      orderBy: desc(auditEvents.createdAt),
    });
  }

  async findByActor(actorId: string, limit: number = 100): Promise<AuditEvent[]> {
    return this.db.query.auditEvents.findMany({
      where: eq(auditEvents.actorId, actorId),
      orderBy: desc(auditEvents.createdAt),
      limit,
    });
  }

  async findByTenant(tenantId: string, limit: number = 100): Promise<AuditEvent[]> {
    return this.db.query.auditEvents.findMany({
      where: eq(auditEvents.tenantId, tenantId),
      orderBy: desc(auditEvents.createdAt),
      limit,
    });
  }

  async create(data: NewAuditEvent): Promise<AuditEvent> {
    const [event] = await this.db.insert(auditEvents).values(data).returning();
    return event;
  }

  async createBatch(data: NewAuditEvent[]): Promise<AuditEvent[]> {
    if (data.length === 0) return [];
    return this.db.insert(auditEvents).values(data).returning();
  }
}

// =============================================================================
// TEMPLATE OVERRIDES REPOSITORY
// =============================================================================

export class TemplateOverrideRepository {
  constructor(private db: DbClient) {}

  async findByProvider(providerKey: string, tenantId?: string): Promise<TemplateOverride[]> {
    const conditions = [eq(templateOverrides.providerKey, providerKey)];
    if (tenantId) {
      conditions.push(eq(templateOverrides.tenantId, tenantId));
    }
    return this.db.query.templateOverrides.findMany({
      where: and(...conditions),
    });
  }

  async findById(id: string): Promise<TemplateOverride | undefined> {
    return this.db.query.templateOverrides.findFirst({
      where: eq(templateOverrides.id, id),
    });
  }

  async findApplicable(
    providerKey: string,
    templateKey: string,
    domainName: string,
    tenantId?: string
  ): Promise<TemplateOverride | undefined> {
    const conditions = [
      eq(templateOverrides.providerKey, providerKey),
      eq(templateOverrides.templateKey, templateKey),
    ];
    
    if (tenantId) {
      conditions.push(eq(templateOverrides.tenantId, tenantId));
    }

    const overrides = await this.db.query.templateOverrides.findMany({
      where: and(...conditions),
    });

    // Find first override that applies to this domain (or applies to all)
    return overrides.find(o => 
      !o.appliesToDomains || 
      o.appliesToDomains.length === 0 ||
      o.appliesToDomains.includes(domainName)
    );
  }

  async create(data: NewTemplateOverride): Promise<TemplateOverride> {
    const [override] = await this.db.insert(templateOverrides).values(data).returning();
    return override;
  }

  async update(id: string, data: Partial<NewTemplateOverride>): Promise<TemplateOverride> {
    const [override] = await this.db
      .update(templateOverrides)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(templateOverrides.id, id))
      .returning();
    return override;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(templateOverrides).where(eq(templateOverrides.id, id));
  }
}

// =============================================================================
// MONITORED DOMAINS REPOSITORY (Bead 15)
// =============================================================================

import { monitoredDomains, alerts, type NewMonitoredDomain, type NewAlert, type MonitoredDomain, type Alert } from '../schema/index.js';

export class MonitoredDomainRepository {
  constructor(private db: DbClient) {}

  async findByTenant(tenantId: string): Promise<MonitoredDomain[]> {
    return this.db.query.monitoredDomains.findMany({
      where: eq(monitoredDomains.tenantId, tenantId),
      orderBy: desc(monitoredDomains.createdAt),
    });
  }

  async findActiveBySchedule(schedule: 'hourly' | 'daily' | 'weekly'): Promise<MonitoredDomain[]> {
    return this.db.query.monitoredDomains.findMany({
      where: and(
        eq(monitoredDomains.schedule, schedule),
        eq(monitoredDomains.isActive, true)
      ),
    });
  }

  async findByDomainId(domainId: string): Promise<MonitoredDomain | undefined> {
    return this.db.query.monitoredDomains.findFirst({
      where: eq(monitoredDomains.domainId, domainId),
    });
  }

  async create(data: NewMonitoredDomain): Promise<MonitoredDomain> {
    const [monitored] = await this.db.insert(monitoredDomains).values(data).returning();
    return monitored;
  }

  async update(id: string, data: Partial<NewMonitoredDomain>): Promise<MonitoredDomain> {
    const [monitored] = await this.db
      .update(monitoredDomains)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(monitoredDomains.id, id))
      .returning();
    return monitored;
  }

  async updateLastCheck(id: string): Promise<void> {
    await this.db
      .update(monitoredDomains)
      .set({ lastCheckAt: new Date() })
      .where(eq(monitoredDomains.id, id));
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(monitoredDomains).where(eq(monitoredDomains.id, id));
  }
}

// =============================================================================
// ALERTS REPOSITORY (Bead 15)
// =============================================================================

export class AlertRepository {
  constructor(private db: DbClient) {}

  async findByMonitoredDomain(monitoredDomainId: string): Promise<Alert[]> {
    return this.db.query.alerts.findMany({
      where: eq(alerts.monitoredDomainId, monitoredDomainId),
      orderBy: desc(alerts.createdAt),
    });
  }

  async findPending(tenantId?: string): Promise<Alert[]> {
    const conditions = [eq(alerts.status, 'pending')];
    if (tenantId) {
      conditions.push(eq(alerts.tenantId, tenantId));
    }
    return this.db.query.alerts.findMany({
      where: and(...conditions),
      orderBy: desc(alerts.createdAt),
    });
  }

  async findByDedupKey(dedupKey: string, since: Date): Promise<Alert[]> {
    return this.db.query.alerts.findMany({
      where: and(
        eq(alerts.dedupKey, dedupKey),
        sql`${alerts.createdAt} > ${since}`
      ),
    });
  }

  async create(data: NewAlert): Promise<Alert> {
    const [alert] = await this.db.insert(alerts).values(data).returning();
    return alert;
  }

  async updateStatus(
    id: string, 
    status: 'pending' | 'sent' | 'suppressed' | 'acknowledged' | 'resolved',
    metadata?: { acknowledgedBy?: string; resolutionNote?: string }
  ): Promise<Alert> {
    const update: Partial<NewAlert> = { status };
    
    if (status === 'acknowledged' && metadata?.acknowledgedBy) {
      update.acknowledgedAt = new Date();
      update.acknowledgedBy = metadata.acknowledgedBy;
    }
    
    if (status === 'resolved') {
      update.resolvedAt = new Date();
      if (metadata?.resolutionNote) {
        update.resolutionNote = metadata.resolutionNote;
      }
    }

    const [alert] = await this.db
      .update(alerts)
      .set(update)
      .where(eq(alerts.id, id))
      .returning();
    return alert;
  }

  async acknowledge(id: string, acknowledgedBy: string): Promise<Alert> {
    return this.updateStatus(id, 'acknowledged', { acknowledgedBy });
  }

  async resolve(id: string, resolutionNote?: string): Promise<Alert> {
    return this.updateStatus(id, 'resolved', { resolutionNote });
  }
}
