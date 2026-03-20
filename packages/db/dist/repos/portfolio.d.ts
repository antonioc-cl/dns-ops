/**
 * Portfolio Repositories - Bead 14
 *
 * Repositories for domain notes, tags, saved filters, audit events,
 * and template overrides.
 */
import type { IDatabaseAdapter } from '../database/simple-adapter.js';
import { type Alert, type AuditEvent, type DomainNote, type DomainTag, type MonitoredDomain, type NewAlert, type NewAuditEvent, type NewDomainNote, type NewDomainTag, type NewMonitoredDomain, type NewSavedFilter, type NewTemplateOverride, type SavedFilter, type TemplateOverride } from '../schema/index.js';
export declare class DomainNoteRepository {
    private db;
    constructor(db: IDatabaseAdapter);
    findByDomainId(domainId: string): Promise<DomainNote[]>;
    findById(id: string): Promise<DomainNote | undefined>;
    create(data: NewDomainNote): Promise<DomainNote>;
    update(id: string, data: Partial<NewDomainNote>): Promise<DomainNote | undefined>;
    delete(id: string): Promise<void>;
}
export declare class DomainTagRepository {
    private db;
    constructor(db: IDatabaseAdapter);
    findByDomainId(domainId: string): Promise<DomainTag[]>;
    findByTag(tag: string, tenantId?: string): Promise<DomainTag[]>;
    findDomainsByTags(tags: string[], tenantId?: string): Promise<string[]>;
    create(data: NewDomainTag): Promise<DomainTag>;
    delete(id: string): Promise<void>;
    deleteByDomainAndTag(domainId: string, tag: string): Promise<void>;
}
export declare class SavedFilterRepository {
    private db;
    constructor(db: IDatabaseAdapter);
    findByTenant(tenantId: string, userId?: string): Promise<SavedFilter[]>;
    findById(id: string): Promise<SavedFilter | undefined>;
    create(data: NewSavedFilter): Promise<SavedFilter>;
    update(id: string, data: Partial<NewSavedFilter>): Promise<SavedFilter | undefined>;
    delete(id: string): Promise<void>;
}
export declare class AuditEventRepository {
    private db;
    constructor(db: IDatabaseAdapter);
    findByEntity(entityType: string, entityId: string): Promise<AuditEvent[]>;
    findByActor(actorId: string, limit?: number): Promise<AuditEvent[]>;
    findByTenant(tenantId: string, limit?: number): Promise<AuditEvent[]>;
    create(data: NewAuditEvent): Promise<AuditEvent>;
    createBatch(data: NewAuditEvent[]): Promise<AuditEvent[]>;
}
export declare class TemplateOverrideRepository {
    private db;
    constructor(db: IDatabaseAdapter);
    findByProvider(providerKey: string, tenantId?: string): Promise<TemplateOverride[]>;
    findById(id: string): Promise<TemplateOverride | undefined>;
    findApplicable(providerKey: string, templateKey: string, domainName: string, tenantId?: string): Promise<TemplateOverride | undefined>;
    create(data: NewTemplateOverride): Promise<TemplateOverride>;
    update(id: string, data: Partial<NewTemplateOverride>): Promise<TemplateOverride | undefined>;
    delete(id: string): Promise<void>;
}
export declare class MonitoredDomainRepository {
    private db;
    constructor(db: IDatabaseAdapter);
    findByTenant(tenantId: string): Promise<MonitoredDomain[]>;
    findActiveBySchedule(schedule: 'hourly' | 'daily' | 'weekly'): Promise<MonitoredDomain[]>;
    findByDomainId(domainId: string): Promise<MonitoredDomain | undefined>;
    create(data: NewMonitoredDomain): Promise<MonitoredDomain>;
    update(id: string, data: Partial<NewMonitoredDomain>): Promise<MonitoredDomain | undefined>;
    updateLastCheck(id: string): Promise<void>;
    delete(id: string): Promise<void>;
}
export declare class AlertRepository {
    private db;
    constructor(db: IDatabaseAdapter);
    findByMonitoredDomain(monitoredDomainId: string): Promise<Alert[]>;
    findPending(tenantId?: string): Promise<Alert[]>;
    findByDedupKey(dedupKey: string, since: Date): Promise<Alert[]>;
    create(data: NewAlert): Promise<Alert>;
    updateStatus(id: string, status: 'pending' | 'sent' | 'suppressed' | 'acknowledged' | 'resolved', metadata?: {
        acknowledgedBy?: string;
        resolutionNote?: string;
    }): Promise<Alert | undefined>;
    acknowledge(id: string, acknowledgedBy: string): Promise<Alert | undefined>;
    resolve(id: string, resolutionNote?: string): Promise<Alert | undefined>;
}
//# sourceMappingURL=portfolio.d.ts.map