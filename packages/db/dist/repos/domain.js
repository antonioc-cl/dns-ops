/**
 * DNS Ops Workbench - Domain Repository
 *
 * Repository pattern for domain operations.
 * Provides type-safe database access with common query patterns.
 */
import { eq, like, desc, sql } from 'drizzle-orm';
import { domains } from '../schema';
export class DomainRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    /**
     * Find a domain by ID
     */
    async findById(id) {
        const result = await this.db
            .select()
            .from(domains)
            .where(eq(domains.id, id))
            .limit(1);
        return result[0];
    }
    /**
     * Find a domain by its normalized name
     */
    async findByName(normalizedName) {
        const result = await this.db
            .select()
            .from(domains)
            .where(eq(domains.normalizedName, normalizedName.toLowerCase()))
            .limit(1);
        return result[0];
    }
    /**
     * Search domains by name pattern
     */
    async searchByName(pattern, limit = 20) {
        return this.db
            .select()
            .from(domains)
            .where(like(domains.normalizedName, `%${pattern.toLowerCase()}%`))
            .limit(limit);
    }
    /**
     * Get all domains for a tenant
     */
    async findByTenant(tenantId, limit = 100) {
        return this.db
            .select()
            .from(domains)
            .where(eq(domains.tenantId, tenantId))
            .limit(limit);
    }
    /**
     * Get domains by zone management type
     */
    async findByZoneManagement(zoneManagement, limit = 100) {
        return this.db
            .select()
            .from(domains)
            .where(eq(domains.zoneManagement, zoneManagement))
            .limit(limit);
    }
    /**
     * Create a new domain
     */
    async create(data) {
        const result = await this.db
            .insert(domains)
            .values({
            ...data,
            normalizedName: data.normalizedName || data.name.toLowerCase(),
        })
            .returning();
        return result[0];
    }
    /**
     * Create a new domain or return existing if name already exists
     */
    async findOrCreate(data) {
        const existing = await this.findByName(data.name);
        if (existing) {
            return existing;
        }
        return this.create(data);
    }
    /**
     * Update domain metadata
     */
    async update(id, data) {
        const result = await this.db
            .update(domains)
            .set({
            ...data,
            updatedAt: new Date(),
        })
            .where(eq(domains.id, id))
            .returning();
        return result[0];
    }
    /**
     * Update zone management status
     */
    async updateZoneManagement(id, zoneManagement) {
        return this.update(id, { zoneManagement });
    }
    /**
     * List all domains with pagination
     */
    async list(options = {}) {
        const { limit = 100, offset = 0 } = options;
        return this.db
            .select()
            .from(domains)
            .orderBy(desc(domains.createdAt))
            .limit(limit)
            .offset(offset);
    }
    /**
     * Count total domains
     */
    async count() {
        const result = await this.db
            .select({ count: sql `count(*)` })
            .from(domains);
        return result[0]?.count || 0;
    }
}
//# sourceMappingURL=domain.js.map