/**
 * Domain Repository
 *
 * Repository pattern for domain operations using the database adapter.
 */
import { eq } from 'drizzle-orm';
import { domains } from '../schema/index.js';
export class DomainRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    /**
     * Find a domain by ID
     */
    async findById(id) {
        return this.db.selectOne(domains, eq(domains.id, id));
    }
    /**
     * Find a domain by its normalized name
     */
    async findByName(normalizedName) {
        return this.db.selectOne(domains, eq(domains.normalizedName, normalizedName.toLowerCase()));
    }
    /**
     * Find a domain by its exact name (case-insensitive)
     */
    async findByExactName(name) {
        return this.db.selectOne(domains, eq(domains.name, name.toLowerCase()));
    }
    /**
     * Search domains by name pattern
     */
    async searchByName(pattern, limit = 20) {
        const allDomains = await this.db.select(domains);
        return allDomains
            .filter(d => d.normalizedName.includes(pattern.toLowerCase()))
            .slice(0, limit);
    }
    /**
     * Find all domains matching filter criteria
     */
    async findAll(filter = {}, options = {}) {
        let results = await this.db.select(domains);
        if (filter.tenantId) {
            results = results.filter(d => d.tenantId === filter.tenantId);
        }
        if (filter.zoneManagement) {
            results = results.filter(d => d.zoneManagement === filter.zoneManagement);
        }
        if (filter.search) {
            const searchLower = filter.search.toLowerCase();
            results = results.filter(d => d.normalizedName.includes(searchLower) ||
                d.name.toLowerCase().includes(searchLower));
        }
        // Apply pagination
        const offset = options.offset || 0;
        const limit = options.limit || results.length;
        return results.slice(offset, offset + limit);
    }
    /**
     * Get domains by zone management type
     */
    async findByZoneManagement(zoneManagement, limit = 100) {
        const results = await this.db.selectWhere(domains, eq(domains.zoneManagement, zoneManagement));
        return results.slice(0, limit);
    }
    /**
     * Create a new domain
     */
    async create(data) {
        const result = await this.db.insert(domains, {
            ...data,
            normalizedName: data.normalizedName || data.name.toLowerCase(),
        });
        return result;
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
        return this.db.updateOne(domains, {
            ...data,
        }, eq(domains.id, id));
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
        const results = await this.db.select(domains);
        return results.slice(offset, offset + limit);
    }
    /**
     * Count total domains
     */
    async count(filter = {}) {
        let results = await this.db.select(domains);
        if (filter.tenantId) {
            results = results.filter(d => d.tenantId === filter.tenantId);
        }
        if (filter.zoneManagement) {
            results = results.filter(d => d.zoneManagement === filter.zoneManagement);
        }
        return results.length;
    }
    /**
     * Delete a domain by ID
     */
    async delete(id) {
        return this.db.deleteOne(domains, eq(domains.id, id));
    }
}
//# sourceMappingURL=domain.js.map