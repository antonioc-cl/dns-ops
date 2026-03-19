/**
 * Portfolio Repositories - Bead 14
 *
 * Repositories for domain notes, tags, saved filters, audit events,
 * and template overrides.
 */

import { eq } from 'drizzle-orm';
import type { IDatabaseAdapter } from '../database/simple-adapter.js';
import {
  domainNotes,
  domainTags,
  savedFilters,
  auditEvents,
  templateOverrides,
  monitoredDomains,
  alerts,
  type NewDomainNote,
  type NewDomainTag,
  type NewSavedFilter,
  type NewAuditEvent,
  type NewTemplateOverride,
  type NewMonitoredDomain,
  type NewAlert,
  type DomainNote,
  type DomainTag,
  type SavedFilter,
  type AuditEvent,
  type TemplateOverride,
  type MonitoredDomain,
  type Alert,
} from '../schema/index.js';

// =============================================================================
// DOMAIN NOTES REPOSITORY
// =============================================================================

export class DomainNoteRepository {
  constructor(private db: IDatabaseAdapter) {}

  async findByDomainId(domainId: string): Promise<DomainNote[]> {
    const results = await this.db.selectWhere(
      domainNotes,
      eq(domainNotes.domainId, domainId)
    );
    return results.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async findById(id: string): Promise<DomainNote | undefined> {
    return this.db.selectOne(domainNotes, eq(domainNotes.id, id));
  }

  async create(data: NewDomainNote): Promise<DomainNote> {
    return this.db.insert(domainNotes, data);
  }

  async update(id: string, data: Partial<NewDomainNote>): Promise<DomainNote | undefined> {
    return this.db.updateOne(
      domainNotes,
      { ...data, updatedAt: new Date() },
      eq(domainNotes.id, id)
    );
  }

  async delete(id: string): Promise<void> {
    await this.db.deleteOne(domainNotes, eq(domainNotes.id, id));
  }
}

// =============================================================================
// DOMAIN TAGS REPOSITORY
// =============================================================================

export class DomainTagRepository {
  constructor(private db: IDatabaseAdapter) {}

  async findByDomainId(domainId: string): Promise<DomainTag[]> {
    const results = await this.db.selectWhere(
      domainTags,
      eq(domainTags.domainId, domainId)
    );
    return results.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async findByTag(tag: string, tenantId?: string): Promise<DomainTag[]> {
    let results = await this.db.select(domainTags);
    results = results.filter(r => r.tag === tag);
    if (tenantId) {
      results = results.filter(r => r.tenantId === tenantId);
    }
    return results;
  }

  async findDomainsByTags(tags: string[], tenantId?: string): Promise<string[]> {
    let results = await this.db.select(domainTags);
    results = results.filter(r => tags.includes(r.tag));
    if (tenantId) {
      results = results.filter(r => r.tenantId === tenantId);
    }
    return [...new Set(results.map(r => r.domainId))];
  }

  async create(data: NewDomainTag): Promise<DomainTag> {
    return this.db.insert(domainTags, data);
  }

  async delete(id: string): Promise<void> {
    await this.db.deleteOne(domainTags, eq(domainTags.id, id));
  }

  async deleteByDomainAndTag(domainId: string, tag: string): Promise<void> {
    const results = await this.db.select(domainTags);
    const toDelete = results.find(
      r => r.domainId === domainId && r.tag === tag
    );
    if (toDelete) {
      await this.db.deleteOne(domainTags, eq(domainTags.id, toDelete.id));
    }
  }
}

// =============================================================================
// SAVED FILTERS REPOSITORY
// =============================================================================

export class SavedFilterRepository {
  constructor(private db: IDatabaseAdapter) {}

  async findByTenant(tenantId: string, userId?: string): Promise<SavedFilter[]> {
    let results = await this.db.select(savedFilters);
    results = results.filter(r => r.tenantId === tenantId);
    
    if (userId) {
      results = results.filter(
        r => r.createdBy === userId || r.isShared
      );
    }
    
    return results.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async findById(id: string): Promise<SavedFilter | undefined> {
    return this.db.selectOne(savedFilters, eq(savedFilters.id, id));
  }

  async create(data: NewSavedFilter): Promise<SavedFilter> {
    return this.db.insert(savedFilters, data);
  }

  async update(id: string, data: Partial<NewSavedFilter>): Promise<SavedFilter | undefined> {
    return this.db.updateOne(
      savedFilters,
      { ...data, updatedAt: new Date() },
      eq(savedFilters.id, id)
    );
  }

  async delete(id: string): Promise<void> {
    await this.db.deleteOne(savedFilters, eq(savedFilters.id, id));
  }
}

// =============================================================================
// AUDIT EVENTS REPOSITORY
// =============================================================================

export class AuditEventRepository {
  constructor(private db: IDatabaseAdapter) {}

  async findByEntity(entityType: string, entityId: string): Promise<AuditEvent[]> {
    const results = await this.db.select(auditEvents);
    return results
      .filter(
        r => r.entityType === entityType && r.entityId === entityId
      )
      .sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }

  async findByActor(actorId: string, limit: number = 100): Promise<AuditEvent[]> {
    const results = await this.db.select(auditEvents);
    return results
      .filter(r => r.actorId === actorId)
      .sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, limit);
  }

  async findByTenant(tenantId: string, limit: number = 100): Promise<AuditEvent[]> {
    const results = await this.db.select(auditEvents);
    return results
      .filter(r => r.tenantId === tenantId)
      .sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, limit);
  }

  async create(data: NewAuditEvent): Promise<AuditEvent> {
    return this.db.insert(auditEvents, data);
  }

  async createBatch(data: NewAuditEvent[]): Promise<AuditEvent[]> {
    if (data.length === 0) return [];
    return this.db.insertMany(auditEvents, data);
  }
}

// =============================================================================
// TEMPLATE OVERRIDES REPOSITORY
// =============================================================================

export class TemplateOverrideRepository {
  constructor(private db: IDatabaseAdapter) {}

  async findByProvider(providerKey: string, tenantId?: string): Promise<TemplateOverride[]> {
    let results = await this.db.select(templateOverrides);
    results = results.filter(r => r.providerKey === providerKey);
    if (tenantId) {
      results = results.filter(r => r.tenantId === tenantId);
    }
    return results;
  }

  async findById(id: string): Promise<TemplateOverride | undefined> {
    return this.db.selectOne(templateOverrides, eq(templateOverrides.id, id));
  }

  async findApplicable(
    providerKey: string,
    templateKey: string,
    domainName: string,
    tenantId?: string
  ): Promise<TemplateOverride | undefined> {
    let results = await this.db.select(templateOverrides);
    results = results.filter(
      r => r.providerKey === providerKey && r.templateKey === templateKey
    );
    
    if (tenantId) {
      results = results.filter(r => r.tenantId === tenantId);
    }

    // Find first override that applies to this domain (or applies to all)
    return results.find(
      o =>
        !o.appliesToDomains ||
        o.appliesToDomains.length === 0 ||
        o.appliesToDomains.includes(domainName)
    );
  }

  async create(data: NewTemplateOverride): Promise<TemplateOverride> {
    return this.db.insert(templateOverrides, data);
  }

  async update(id: string, data: Partial<NewTemplateOverride>): Promise<TemplateOverride | undefined> {
    return this.db.updateOne(
      templateOverrides,
      { ...data, updatedAt: new Date() },
      eq(templateOverrides.id, id)
    );
  }

  async delete(id: string): Promise<void> {
    await this.db.deleteOne(templateOverrides, eq(templateOverrides.id, id));
  }
}

// =============================================================================
// MONITORED DOMAINS REPOSITORY (Bead 15)
// =============================================================================

export class MonitoredDomainRepository {
  constructor(private db: IDatabaseAdapter) {}

  async findByTenant(tenantId: string): Promise<MonitoredDomain[]> {
    const results = await this.db.selectWhere(
      monitoredDomains,
      eq(monitoredDomains.tenantId, tenantId)
    );
    return results.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async findActiveBySchedule(schedule: 'hourly' | 'daily' | 'weekly'): Promise<MonitoredDomain[]> {
    const results = await this.db.select(monitoredDomains);
    return results.filter(
      r => r.schedule === schedule && r.isActive
    );
  }

  async findByDomainId(domainId: string): Promise<MonitoredDomain | undefined> {
    const results = await this.db.selectWhere(
      monitoredDomains,
      eq(monitoredDomains.domainId, domainId)
    );
    return results[0];
  }

  async create(data: NewMonitoredDomain): Promise<MonitoredDomain> {
    return this.db.insert(monitoredDomains, data);
  }

  async update(id: string, data: Partial<NewMonitoredDomain>): Promise<MonitoredDomain | undefined> {
    return this.db.updateOne(
      monitoredDomains,
      { ...data, updatedAt: new Date() },
      eq(monitoredDomains.id, id)
    );
  }

  async updateLastCheck(id: string): Promise<void> {
    await this.db.updateOne(
      monitoredDomains,
      { lastCheckAt: new Date() },
      eq(monitoredDomains.id, id)
    );
  }

  async delete(id: string): Promise<void> {
    await this.db.deleteOne(monitoredDomains, eq(monitoredDomains.id, id));
  }
}

// =============================================================================
// ALERTS REPOSITORY (Bead 15)
// =============================================================================

export class AlertRepository {
  constructor(private db: IDatabaseAdapter) {}

  async findByMonitoredDomain(monitoredDomainId: string): Promise<Alert[]> {
    const results = await this.db.selectWhere(
      alerts,
      eq(alerts.monitoredDomainId, monitoredDomainId)
    );
    return results.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async findPending(tenantId?: string): Promise<Alert[]> {
    let results = await this.db.selectWhere(alerts, eq(alerts.status, 'pending'));
    if (tenantId) {
      results = results.filter(r => r.tenantId === tenantId);
    }
    return results.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async findByDedupKey(dedupKey: string, since: Date): Promise<Alert[]> {
    const results = await this.db.select(alerts);
    return results.filter(
      r => r.dedupKey === dedupKey && new Date(r.createdAt) > since
    );
  }

  async create(data: NewAlert): Promise<Alert> {
    return this.db.insert(alerts, data);
  }

  async updateStatus(
    id: string,
    status: 'pending' | 'sent' | 'suppressed' | 'acknowledged' | 'resolved',
    metadata?: { acknowledgedBy?: string; resolutionNote?: string }
  ): Promise<Alert | undefined> {
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

    return this.db.updateOne(alerts, update, eq(alerts.id, id));
  }

  async acknowledge(id: string, acknowledgedBy: string): Promise<Alert | undefined> {
    return this.updateStatus(id, 'acknowledged', { acknowledgedBy });
  }

  async resolve(id: string, resolutionNote?: string): Promise<Alert | undefined> {
    return this.updateStatus(id, 'resolved', { resolutionNote });
  }
}
