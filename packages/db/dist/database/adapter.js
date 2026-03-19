/**
 * Database Adapter - Clean abstraction for database operations
 *
 * Wraps Drizzle ORM instances and provides type-safe operations
 * that work consistently across PostgreSQL and D1.
 */
// =============================================================================
// POSTGRESQL ADAPTER
// =============================================================================
export class PostgresAdapter {
    db;
    type = 'postgres';
    constructor(db) {
        this.db = db;
    }
    async query(sql, params) {
        const result = await this.db.execute(sql, params);
        return {
            rows: result.rows,
            rowCount: result.rowCount || 0,
        };
    }
    async select(table) {
        return await this.db.select().from(table);
    }
    async selectWhere(table, condition) {
        return await this.db.select().from(table).where(condition);
    }
    async selectOne(table, condition) {
        const results = await this.db.select().from(table).where(condition).limit(1);
        return results[0];
    }
    async insert(table, values) {
        const results = await this.db.insert(table).values(values).returning();
        return results[0];
    }
    async insertMany(table, values) {
        return await this.db.insert(table).values(values).returning();
    }
    async update(table, values, condition) {
        return await this.db.update(table).set(values).where(condition).returning();
    }
    async updateOne(table, values, condition) {
        const results = await this.db
            .update(table)
            .set(values)
            .where(condition)
            .returning()
            .limit(1);
        return results[0];
    }
    async delete(table, condition) {
        return await this.db.delete(table).where(condition).returning();
    }
    async deleteOne(table, condition) {
        const results = await this.db
            .delete(table)
            .where(condition)
            .returning()
            .limit(1);
        return results[0];
    }
    async transaction(callback) {
        return await this.db.transaction(async (tx) => {
            const txAdapter = new PostgresAdapter(tx);
            return await callback(txAdapter);
        });
    }
    async ping() {
        try {
            await this.db.execute('SELECT 1');
            return true;
        }
        catch {
            return false;
        }
    }
}
// =============================================================================
// D1 ADAPTER
// =============================================================================
export class D1Adapter {
    db;
    type = 'd1';
    constructor(db) {
        this.db = db;
    }
    async query(sql, params) {
        // D1 uses a different query interface
        const stmt = this.db.run(sql);
        const result = params ? await stmt.bind(...params) : await stmt;
        return {
            rows: result.results,
            rowCount: result.meta?.changes || 0,
        };
    }
    async select(table) {
        return await this.db.select().from(table).all();
    }
    async selectWhere(table, condition) {
        return await this.db.select().from(table).where(condition).all();
    }
    async selectOne(table, condition) {
        return await this.db.select().from(table).where(condition).get();
    }
    async insert(table, values) {
        const result = await this.db.insert(table).values(values).returning().get();
        if (!result || typeof result !== 'object') {
            throw new Error('Insert failed - no row returned');
        }
        return result;
    }
    async insertMany(table, values) {
        const results = await this.db.insert(table).values(values).returning().all();
        return results;
    }
    async update(table, values, condition) {
        const results = await this.db.update(table).set(values).where(condition).returning().all();
        return results;
    }
    async updateOne(table, values, condition) {
        const result = await this.db.update(table).set(values).where(condition).returning().get();
        return result;
    }
    async delete(table, condition) {
        const results = await this.db.delete(table).where(condition).returning().all();
        return results;
    }
    async deleteOne(table, condition) {
        const result = await this.db.delete(table).where(condition).returning().get();
        return result;
    }
    async transaction(callback) {
        // D1 transactions are handled differently - may need batching
        // For now, execute without transaction wrapper
        // TODO: Implement proper D1 transaction support
        return await callback(this);
    }
    async ping() {
        try {
            await this.query('SELECT 1');
            return true;
        }
        catch {
            return false;
        }
    }
}
/**
 * Create appropriate database adapter based on configuration
 */
export function createAdapter(db, type) {
    if (type === 'postgres') {
        return new PostgresAdapter(db);
    }
    else {
        return new D1Adapter(db);
    }
}
//# sourceMappingURL=adapter.js.map