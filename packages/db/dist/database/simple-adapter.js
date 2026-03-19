/**
 * Simple Database Adapter
 *
 * Type-safe adapter using type assertions to work around
 * Drizzle's strict typing while maintaining clean interfaces.
 */
/**
 * Simple database adapter that works with both PostgreSQL and D1
 * Uses type assertions to work around Drizzle's complex union types
 */
export class SimpleDatabaseAdapter {
    db;
    type;
    constructor(db, type) {
        this.db = db;
        this.type = type;
    }
    /**
     * Get underlying Drizzle instance (for advanced use cases)
     */
    getDrizzle() {
        return this.db;
    }
    /**
     * Select all records from table
     */
    async select(table) {
        const db = this.db;
        return await db.select().from(table);
    }
    /**
     * Select records matching condition
     */
    async selectWhere(table, condition) {
        const db = this.db;
        return await db.select().from(table).where(condition);
    }
    /**
     * Select single record matching condition
     */
    async selectOne(table, condition) {
        const db = this.db;
        const results = await db.select().from(table).where(condition).limit(1);
        return results[0];
    }
    /**
     * Insert single record
     */
    async insert(table, values) {
        const db = this.db;
        const results = await db.insert(table).values(values).returning();
        return results[0];
    }
    /**
     * Insert multiple records
     */
    async insertMany(table, values) {
        const db = this.db;
        return await db.insert(table).values(values).returning();
    }
    /**
     * Update records matching condition
     */
    async update(table, values, condition) {
        const db = this.db;
        return await db.update(table).set(values).where(condition).returning();
    }
    /**
     * Update single record
     */
    async updateOne(table, values, condition) {
        const db = this.db;
        const results = await db.update(table).set(values).where(condition).returning();
        return results[0];
    }
    /**
     * Delete records matching condition
     */
    async delete(table, condition) {
        const db = this.db;
        return await db.delete(table).where(condition).returning();
    }
    /**
     * Delete single record
     */
    async deleteOne(table, condition) {
        const db = this.db;
        const results = await db.delete(table).where(condition).returning();
        return results[0];
    }
    /**
     * Execute within a transaction
     */
    async transaction(callback) {
        const db = this.db;
        return await db.transaction(async (tx) => {
            const txAdapter = new SimpleDatabaseAdapter(tx, this.type);
            return await callback(txAdapter);
        });
    }
}
/**
 * Create adapter from Drizzle instance
 */
export function createSimpleAdapter(db, type) {
    return new SimpleDatabaseAdapter(db, type);
}
//# sourceMappingURL=simple-adapter.js.map