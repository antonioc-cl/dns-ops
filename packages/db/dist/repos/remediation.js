/**
 * Remediation Request Repository
 *
 * Database operations for remediation requests.
 */
import { eq, desc, and, inArray, sql } from 'drizzle-orm';
import { remediationRequests, } from '../schema/remediation';
export class RemediationRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    /**
     * Create a new remediation request
     */
    async create(data) {
        const [result] = await this.db
            .insert(remediationRequests)
            .values(data)
            .returning();
        if (!result) {
            throw new Error('Failed to create remediation request');
        }
        return result;
    }
    /**
     * Find remediation request by ID
     */
    async findById(id) {
        const [result] = await this.db
            .select()
            .from(remediationRequests)
            .where(eq(remediationRequests.id, id));
        return result || null;
    }
    /**
     * Find all remediation requests for a domain
     */
    async findByDomain(domain) {
        return this.db
            .select()
            .from(remediationRequests)
            .where(eq(remediationRequests.domain, domain))
            .orderBy(desc(remediationRequests.createdAt));
    }
    /**
     * Find remediation requests by snapshot ID
     */
    async findBySnapshotId(snapshotId) {
        return this.db
            .select()
            .from(remediationRequests)
            .where(eq(remediationRequests.snapshotId, snapshotId))
            .orderBy(desc(remediationRequests.createdAt));
    }
    /**
     * Find remediation requests by status
     */
    async findByStatus(status, limit) {
        let query = this.db
            .select()
            .from(remediationRequests)
            .where(eq(remediationRequests.status, status))
            .orderBy(desc(remediationRequests.createdAt));
        if (limit) {
            query = query.limit(limit);
        }
        return query;
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
        const [result] = await this.db
            .update(remediationRequests)
            .set(updates)
            .where(eq(remediationRequests.id, id))
            .returning();
        return result || null;
    }
    /**
     * Close a remediation request
     */
    async close(id, reason) {
        const [result] = await this.db
            .update(remediationRequests)
            .set({
            status: 'closed',
            notes: reason,
            updatedAt: new Date(),
        })
            .where(eq(remediationRequests.id, id))
            .returning();
        return result || null;
    }
    /**
     * List remediation requests with filtering
     */
    async list(options) {
        let conditions = [];
        if (options?.domains?.length) {
            conditions.push(inArray(remediationRequests.domain, options.domains));
        }
        if (options?.statuses?.length) {
            conditions.push(inArray(remediationRequests.status, options.statuses));
        }
        if (options?.priorities?.length) {
            conditions.push(inArray(remediationRequests.priority, options.priorities));
        }
        let query = this.db
            .select()
            .from(remediationRequests)
            .orderBy(desc(remediationRequests.createdAt));
        if (conditions.length > 0) {
            query = query.where(and(...conditions));
        }
        if (options?.limit) {
            query = query.limit(options.limit);
        }
        if (options?.offset) {
            query = query.offset(options.offset);
        }
        return query;
    }
    /**
     * Count remediation requests by status
     */
    async countByStatus() {
        const results = await this.db
            .select({
            status: remediationRequests.status,
            count: sql `count(*)`,
        })
            .from(remediationRequests)
            .groupBy(remediationRequests.status);
        return results.reduce((acc, row) => {
            acc[row.status] = Number(row.count);
            return acc;
        }, { open: 0, 'in-progress': 0, resolved: 0, closed: 0 });
    }
}
//# sourceMappingURL=remediation.js.map