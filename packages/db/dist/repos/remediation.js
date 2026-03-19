/**
 * Remediation Request Repository
 *
 * Database operations for remediation requests.
 */
import { eq } from 'drizzle-orm';
import { remediationRequests, } from '../schema/remediation.js';
export class RemediationRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    /**
     * Create a new remediation request
     */
    async create(data) {
        return this.db.insert(remediationRequests, data);
    }
    /**
     * Find remediation request by ID
     */
    async findById(id) {
        const result = await this.db.selectOne(remediationRequests, eq(remediationRequests.id, id));
        return result || null;
    }
    /**
     * Find all remediation requests for a domain
     */
    async findByDomain(domain) {
        const results = await this.db.selectWhere(remediationRequests, eq(remediationRequests.domain, domain));
        return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    /**
     * Find remediation requests by snapshot ID
     */
    async findBySnapshotId(snapshotId) {
        const results = await this.db.selectWhere(remediationRequests, eq(remediationRequests.snapshotId, snapshotId));
        return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    /**
     * Find remediation requests by status
     */
    async findByStatus(status, limit) {
        const results = await this.db.selectWhere(remediationRequests, eq(remediationRequests.status, status));
        return results
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, limit);
    }
    /**
     * Update remediation request status
     */
    async updateStatus(id, status, assignedTo) {
        const updates = {
            status,
            updatedAt: new Date(),
        };
        if (assignedTo !== undefined) {
            updates.assignedTo = assignedTo;
        }
        if (status === 'resolved') {
            updates.resolvedAt = new Date();
        }
        const result = await this.db.updateOne(remediationRequests, updates, eq(remediationRequests.id, id));
        return result || null;
    }
    /**
     * Close a remediation request
     */
    async close(id, reason) {
        const result = await this.db.updateOne(remediationRequests, {
            status: 'closed',
            notes: reason,
            updatedAt: new Date(),
        }, eq(remediationRequests.id, id));
        return result || null;
    }
    /**
     * List remediation requests with filtering
     */
    async list(options) {
        let results = await this.db.select(remediationRequests);
        if (options?.domains?.length) {
            results = results.filter(r => options.domains.includes(r.domain));
        }
        if (options?.statuses?.length) {
            results = results.filter(r => options.statuses.includes(r.status));
        }
        if (options?.priorities?.length) {
            results = results.filter(r => options.priorities.includes(r.priority));
        }
        // Sort by createdAt desc
        results = results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        // Apply pagination
        const offset = options?.offset || 0;
        const limit = options?.limit || results.length;
        return results.slice(offset, offset + limit);
    }
    /**
     * Count remediation requests by status
     */
    async countByStatus() {
        const results = await this.db.select(remediationRequests);
        const counts = { open: 0, 'in-progress': 0, resolved: 0, closed: 0 };
        for (const row of results) {
            counts[row.status]++;
        }
        return counts;
    }
}
//# sourceMappingURL=remediation.js.map