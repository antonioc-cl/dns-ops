/**
 * Base Repository
 *
 * Abstract base class for all repositories using the database adapter.
 * Provides common functionality and type safety.
 */
import { eq } from 'drizzle-orm';
export class BaseRepository {
    db;
    table;
    options;
    constructor(db, table, options = {}) {
        this.db = db;
        this.table = table;
        this.options = options;
    }
    /**
     * Find all records with optional filtering
     */
    async findAll(options) {
        const results = await this.db.select(this.table);
        // Apply pagination if specified
        if (options?.limit || options?.offset) {
            const offset = options.offset || 0;
            const limit = options.limit || results.length;
            return results.slice(offset, offset + limit);
        }
        return results;
    }
    /**
     * Find a single record by ID
     */
    async findById(id) {
        return this.db.selectOne(this.table, eq(this.table.id, id));
    }
    /**
     * Find records matching a condition
     */
    async findWhere(condition, options) {
        const results = await this.db.selectWhere(this.table, condition);
        if (options?.limit) {
            return results.slice(0, options.limit);
        }
        return results;
    }
    /**
     * Find a single record matching a condition
     */
    async findOne(condition) {
        return this.db.selectOne(this.table, condition);
    }
    /**
     * Create a new record
     */
    async create(data) {
        return this.db.insert(this.table, data);
    }
    /**
     * Create multiple records
     */
    async createMany(data) {
        return this.db.insertMany(this.table, data);
    }
    /**
     * Update a record by ID
     */
    async update(id, data) {
        const results = await this.db.updateOne(this.table, data, eq(this.table.id, id));
        return results;
    }
    /**
     * Update records matching a condition
     */
    async updateWhere(condition, data) {
        return this.db.update(this.table, data, condition);
    }
    /**
     * Delete a record by ID
     */
    async delete(id) {
        return this.db.deleteOne(this.table, eq(this.table.id, id));
    }
    /**
     * Delete records matching a condition
     */
    async deleteWhere(condition) {
        return this.db.delete(this.table, condition);
    }
    /**
     * Execute within a transaction
     */
    async transaction(callback) {
        return this.db.transaction(async () => callback(this));
    }
}
//# sourceMappingURL=base.js.map