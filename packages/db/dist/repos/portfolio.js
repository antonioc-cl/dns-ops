/**
 * Portfolio Repositories - Bead 14
 *
 * Repositories for domain notes, tags, saved filters, audit events,
 * and template overrides.
 */
import { eq } from 'drizzle-orm';
import { domainNotes, domainTags, savedFilters, auditEvents, templateOverrides, monitoredDomains, alerts, } from '../schema/index.js';
// =============================================================================
// DOMAIN NOTES REPOSITORY
// =============================================================================
export class DomainNoteRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async findByDomainId(domainId) {
        const results = await this.db.selectWhere(domainNotes, eq(domainNotes.domainId, domainId));
        return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    async findById(id) {
        return this.db.selectOne(domainNotes, eq(domainNotes.id, id));
    }
    async create(data) {
        return this.db.insert(domainNotes, data);
    }
    async update(id, data) {
        return this.db.updateOne(domainNotes, { ...data, updatedAt: new Date() }, eq(domainNotes.id, id));
    }
    async delete(id) {
        await this.db.deleteOne(domainNotes, eq(domainNotes.id, id));
    }
}
// =============================================================================
// DOMAIN TAGS REPOSITORY
// =============================================================================
export class DomainTagRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async findByDomainId(domainId) {
        const results = await this.db.selectWhere(domainTags, eq(domainTags.domainId, domainId));
        return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    async findByTag(tag, tenantId) {
        let results = await this.db.select(domainTags);
        results = results.filter(r => r.tag === tag);
        if (tenantId) {
            results = results.filter(r => r.tenantId === tenantId);
        }
        return results;
    }
    async findDomainsByTags(tags, tenantId) {
        let results = await this.db.select(domainTags);
        results = results.filter(r => tags.includes(r.tag));
        if (tenantId) {
            results = results.filter(r => r.tenantId === tenantId);
        }
        return [...new Set(results.map(r => r.domainId))];
    }
    async create(data) {
        return this.db.insert(domainTags, data);
    }
    async delete(id) {
        await this.db.deleteOne(domainTags, eq(domainTags.id, id));
    }
    async deleteByDomainAndTag(domainId, tag) {
        const results = await this.db.select(domainTags);
        const toDelete = results.find(r => r.domainId === domainId && r.tag === tag);
        if (toDelete) {
            await this.db.deleteOne(domainTags, eq(domainTags.id, toDelete.id));
        }
    }
}
// =============================================================================
// SAVED FILTERS REPOSITORY
// =============================================================================
export class SavedFilterRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async findByTenant(tenantId, userId) {
        let results = await this.db.select(savedFilters);
        results = results.filter(r => r.tenantId === tenantId);
        if (userId) {
            results = results.filter(r => r.createdBy === userId || r.isShared);
        }
        return results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }
    async findById(id) {
        return this.db.selectOne(savedFilters, eq(savedFilters.id, id));
    }
    async create(data) {
        return this.db.insert(savedFilters, data);
    }
    async update(id, data) {
        return this.db.updateOne(savedFilters, { ...data, updatedAt: new Date() }, eq(savedFilters.id, id));
    }
    async delete(id) {
        await this.db.deleteOne(savedFilters, eq(savedFilters.id, id));
    }
}
// =============================================================================
// AUDIT EVENTS REPOSITORY
// =============================================================================
export class AuditEventRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async findByEntity(entityType, entityId) {
        const results = await this.db.select(auditEvents);
        return results
            .filter(r => r.entityType === entityType && r.entityId === entityId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    async findByActor(actorId, limit = 100) {
        const results = await this.db.select(auditEvents);
        return results
            .filter(r => r.actorId === actorId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, limit);
    }
    async findByTenant(tenantId, limit = 100) {
        const results = await this.db.select(auditEvents);
        return results
            .filter(r => r.tenantId === tenantId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, limit);
    }
    async create(data) {
        return this.db.insert(auditEvents, data);
    }
    async createBatch(data) {
        if (data.length === 0)
            return [];
        return this.db.insertMany(auditEvents, data);
    }
}
// =============================================================================
// TEMPLATE OVERRIDES REPOSITORY
// =============================================================================
export class TemplateOverrideRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async findByProvider(providerKey, tenantId) {
        let results = await this.db.select(templateOverrides);
        results = results.filter(r => r.providerKey === providerKey);
        if (tenantId) {
            results = results.filter(r => r.tenantId === tenantId);
        }
        return results;
    }
    async findById(id) {
        return this.db.selectOne(templateOverrides, eq(templateOverrides.id, id));
    }
    async findApplicable(providerKey, templateKey, domainName, tenantId) {
        let results = await this.db.select(templateOverrides);
        results = results.filter(r => r.providerKey === providerKey && r.templateKey === templateKey);
        if (tenantId) {
            results = results.filter(r => r.tenantId === tenantId);
        }
        // Find first override that applies to this domain (or applies to all)
        return results.find(o => !o.appliesToDomains ||
            o.appliesToDomains.length === 0 ||
            o.appliesToDomains.includes(domainName));
    }
    async create(data) {
        return this.db.insert(templateOverrides, data);
    }
    async update(id, data) {
        return this.db.updateOne(templateOverrides, { ...data, updatedAt: new Date() }, eq(templateOverrides.id, id));
    }
    async delete(id) {
        await this.db.deleteOne(templateOverrides, eq(templateOverrides.id, id));
    }
}
// =============================================================================
// MONITORED DOMAINS REPOSITORY (Bead 15)
// =============================================================================
export class MonitoredDomainRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async findByTenant(tenantId) {
        const results = await this.db.selectWhere(monitoredDomains, eq(monitoredDomains.tenantId, tenantId));
        return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    async findActiveBySchedule(schedule) {
        const results = await this.db.select(monitoredDomains);
        return results.filter(r => r.schedule === schedule && r.isActive);
    }
    async findByDomainId(domainId) {
        const results = await this.db.selectWhere(monitoredDomains, eq(monitoredDomains.domainId, domainId));
        return results[0];
    }
    async create(data) {
        return this.db.insert(monitoredDomains, data);
    }
    async update(id, data) {
        return this.db.updateOne(monitoredDomains, { ...data, updatedAt: new Date() }, eq(monitoredDomains.id, id));
    }
    async updateLastCheck(id) {
        await this.db.updateOne(monitoredDomains, { lastCheckAt: new Date() }, eq(monitoredDomains.id, id));
    }
    async delete(id) {
        await this.db.deleteOne(monitoredDomains, eq(monitoredDomains.id, id));
    }
}
// =============================================================================
// ALERTS REPOSITORY (Bead 15)
// =============================================================================
export class AlertRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async findByMonitoredDomain(monitoredDomainId) {
        const results = await this.db.selectWhere(alerts, eq(alerts.monitoredDomainId, monitoredDomainId));
        return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    async findPending(tenantId) {
        let results = await this.db.selectWhere(alerts, eq(alerts.status, 'pending'));
        if (tenantId) {
            results = results.filter(r => r.tenantId === tenantId);
        }
        return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    async findByDedupKey(dedupKey, since) {
        const results = await this.db.select(alerts);
        return results.filter(r => r.dedupKey === dedupKey && new Date(r.createdAt) > since);
    }
    async create(data) {
        return this.db.insert(alerts, data);
    }
    async updateStatus(id, status, metadata) {
        const update = { status };
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
    async acknowledge(id, acknowledgedBy) {
        return this.updateStatus(id, 'acknowledged', { acknowledgedBy });
    }
    async resolve(id, resolutionNote) {
        return this.updateStatus(id, 'resolved', { resolutionNote });
    }
}
//# sourceMappingURL=portfolio.js.map