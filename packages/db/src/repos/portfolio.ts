/**
 * Portfolio Repositories - Bead 14
 *
 * Repositories for domain notes, tags, saved filters, audit events,
 * and template overrides.
 */

import { eq } from 'drizzle-orm';
import type { IDatabaseAdapter } from '../database/simple-adapter.js';
import {
  type Alert,
  type AuditEvent,
  alerts,
  auditEvents,
  type DomainNote,
  type DomainTag,
  domainNotes,
  domainTags,
  type MonitoredDomain,
  monitoredDomains,
  type NewAlert,
  type NewAuditEvent,
  type NewDomainNote,
  type NewDomainTag,
  type NewMonitoredDomain,
  type NewSavedFilter,
  type NewSharedReport,
  type NewTemplateOverride,
  type SavedFilter,
  type SharedReport,
  savedFilters,
  sharedReports,
  type TemplateOverride,
  templateOverrides,
} from '../schema/index.js';

// =============================================================================
// DOMAIN NOTES REPOSITORY
// =============================================================================

export class DomainNoteRepository {
  constructor(private db: IDatabaseAdapter) {}

  async findByDomainId(domainId: string): Promise<DomainNote[]> {
    const results = await this.db.selectWhere(domainNotes, eq(domainNotes.domainId, domainId));
    return results.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
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
    const results = await this.db.selectWhere(domainTags, eq(domainTags.domainId, domainId));
    return results.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async findByTag(tag: string, tenantId?: string): Promise<DomainTag[]> {
    let results = await this.db.select(domainTags);
    results = results.filter((r) => r.tag === tag);
    if (tenantId) {
      results = results.filter((r) => r.tenantId === tenantId);
    }
    return results;
  }

  async findDomainsByTags(tags: string[], tenantId?: string): Promise<string[]> {
    let results = await this.db.select(domainTags);
    results = results.filter((r) => tags.includes(r.tag));
    if (tenantId) {
      results = results.filter((r) => r.tenantId === tenantId);
    }
    return [...new Set(results.map((r) => r.domainId))];
  }

  async listByTenant(tenantId: string): Promise<string[]> {
    const results = await this.db.select(domainTags);
    return [...new Set(results.filter((r) => r.tenantId === tenantId).map((r) => r.tag))].sort();
  }

  async create(data: NewDomainTag): Promise<DomainTag> {
    return this.db.insert(domainTags, data);
  }

  async delete(id: string): Promise<void> {
    await this.db.deleteOne(domainTags, eq(domainTags.id, id));
  }

  async deleteByDomainAndTag(domainId: string, tag: string): Promise<void> {
    const results = await this.db.select(domainTags);
    const toDelete = results.find((r) => r.domainId === domainId && r.tag === tag);
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
    results = results.filter((r) => r.tenantId === tenantId);

    if (userId) {
      results = results.filter((r) => r.createdBy === userId || r.isShared);
    }

    return results.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
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
      .filter((r) => r.entityType === entityType && r.entityId === entityId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async findByActor(actorId: string, limit: number = 100): Promise<AuditEvent[]> {
    const results = await this.db.select(auditEvents);
    return results
      .filter((r) => r.actorId === actorId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  async findByTenant(tenantId: string, limit: number = 100): Promise<AuditEvent[]> {
    const results = await this.db.select(auditEvents);
    return results
      .filter((r) => r.tenantId === tenantId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
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
    results = results.filter((r) => r.providerKey === providerKey);
    if (tenantId) {
      results = results.filter((r) => r.tenantId === tenantId);
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
    results = results.filter((r) => r.providerKey === providerKey && r.templateKey === templateKey);

    if (tenantId) {
      results = results.filter((r) => r.tenantId === tenantId);
    }

    // Find first override that applies to this domain (or applies to all)
    return results.find(
      (o) =>
        !o.appliesToDomains ||
        o.appliesToDomains.length === 0 ||
        o.appliesToDomains.includes(domainName)
    );
  }

  async create(data: NewTemplateOverride): Promise<TemplateOverride> {
    return this.db.insert(templateOverrides, data);
  }

  async update(
    id: string,
    data: Partial<NewTemplateOverride>
  ): Promise<TemplateOverride | undefined> {
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
    return results.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async findActiveBySchedule(schedule: 'hourly' | 'daily' | 'weekly'): Promise<MonitoredDomain[]> {
    const results = await this.db.select(monitoredDomains);
    return results.filter((r) => r.schedule === schedule && r.isActive);
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

  async update(
    id: string,
    data: Partial<NewMonitoredDomain>
  ): Promise<MonitoredDomain | undefined> {
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

type AlertStatus = Alert['status'];

function canTransitionAlert(currentStatus: AlertStatus, nextStatus: AlertStatus): boolean {
  if (currentStatus === nextStatus) {
    return true;
  }

  switch (nextStatus) {
    case 'acknowledged':
      return ['pending', 'sent', 'suppressed'].includes(currentStatus);
    case 'resolved':
      return ['pending', 'sent', 'acknowledged', 'suppressed'].includes(currentStatus);
    case 'suppressed':
      return ['pending', 'sent', 'acknowledged'].includes(currentStatus);
    case 'pending':
    case 'sent':
      return false;
    default:
      return false;
  }
}

export class AlertRepository {
  constructor(private db: IDatabaseAdapter) {}

  async findByMonitoredDomain(monitoredDomainId: string): Promise<Alert[]> {
    const results = await this.db.selectWhere(
      alerts,
      eq(alerts.monitoredDomainId, monitoredDomainId)
    );
    return results.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async findAll(
    tenantId: string,
    options: {
      status?: AlertStatus;
      severity?: Alert['severity'];
      limit: number;
      offset: number;
    }
  ): Promise<{ alerts: Alert[]; total: number }> {
    let results = await this.db.select(alerts);
    results = results.filter((alert) => alert.tenantId === tenantId);

    if (options.status) {
      results = results.filter((alert) => alert.status === options.status);
    }

    if (options.severity) {
      results = results.filter((alert) => alert.severity === options.severity);
    }

    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const total = results.length;

    return {
      alerts: results.slice(options.offset, options.offset + options.limit),
      total,
    };
  }

  async findById(id: string, tenantId: string): Promise<Alert | undefined> {
    const alert = await this.db.selectOne(alerts, eq(alerts.id, id));
    if (!alert || alert.tenantId !== tenantId) {
      return undefined;
    }
    return alert;
  }

  async findPending(tenantId?: string): Promise<Alert[]> {
    let results = await this.db.selectWhere(alerts, eq(alerts.status, 'pending'));
    if (tenantId) {
      results = results.filter((r) => r.tenantId === tenantId);
    }
    return results.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async findByDedupKey(dedupKey: string, since: Date): Promise<Alert[]> {
    const results = await this.db.select(alerts);
    return results.filter((r) => r.dedupKey === dedupKey && new Date(r.createdAt) > since);
  }

  async create(data: NewAlert): Promise<Alert> {
    return this.db.insert(alerts, data);
  }

  async updateStatus(
    id: string,
    tenantId: string,
    status: AlertStatus,
    metadata?: { acknowledgedBy?: string; resolutionNote?: string }
  ): Promise<Alert | undefined> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      return undefined;
    }

    if (!canTransitionAlert(existing.status, status)) {
      throw new Error(`Invalid alert transition: ${existing.status} -> ${status}`);
    }

    if (existing.status === status) {
      return existing;
    }

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

  async acknowledge(
    id: string,
    tenantId: string,
    acknowledgedBy: string
  ): Promise<Alert | undefined> {
    return this.updateStatus(id, tenantId, 'acknowledged', { acknowledgedBy });
  }

  async resolve(id: string, tenantId: string, resolutionNote?: string): Promise<Alert | undefined> {
    return this.updateStatus(id, tenantId, 'resolved', { resolutionNote });
  }
}

// =============================================================================
// SHARED REPORTS REPOSITORY (Bead 20)
// =============================================================================

export class SharedReportRepository {
  constructor(private db: IDatabaseAdapter) {}

  async create(data: NewSharedReport): Promise<SharedReport> {
    return this.db.insert(sharedReports, data);
  }

  async findById(id: string, tenantId: string): Promise<SharedReport | undefined> {
    const report = await this.db.selectOne(sharedReports, eq(sharedReports.id, id));
    if (!report || report.tenantId !== tenantId) {
      return undefined;
    }
    return report;
  }

  async findByToken(token: string): Promise<SharedReport | undefined> {
    const reports = await this.db.select(sharedReports);
    const now = new Date();
    return reports.find((report) => {
      if (report.shareToken !== token || report.visibility !== 'shared' || !report.tenantId) {
        return false;
      }
      if (report.status !== 'ready') {
        return false;
      }
      if (report.expiresAt && new Date(report.expiresAt) <= now) {
        return false;
      }
      return true;
    });
  }

  async findByTokenRaw(token: string): Promise<SharedReport | undefined> {
    const reports = await this.db.select(sharedReports);
    return reports.find((report) => {
      if (report.shareToken !== token || report.visibility !== 'shared' || !report.tenantId) {
        return false;
      }
      return true;
    });
  }

  async listByTenant(tenantId: string): Promise<SharedReport[]> {
    const reports = await this.db.select(sharedReports);
    return reports
      .filter((report) => report.tenantId === tenantId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async expire(id: string, tenantId: string): Promise<SharedReport | undefined> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      return undefined;
    }

    return this.db.updateOne(
      sharedReports,
      { status: 'expired', updatedAt: new Date() },
      eq(sharedReports.id, id)
    );
  }
}
