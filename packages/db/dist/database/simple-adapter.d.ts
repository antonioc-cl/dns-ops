/**
 * Simple Database Adapter
 *
 * Type-safe adapter using type assertions to work around
 * Drizzle's strict typing while maintaining clean interfaces.
 */
import type { SQL } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { PgTable } from 'drizzle-orm/pg-core';
import type * as schema from '../schema/index.js';
type Schema = typeof schema;
type AnyDrizzleDB = NodePgDatabase<Schema> | DrizzleD1Database<Schema>;
/**
 * Simple database adapter that works with both PostgreSQL and D1
 * Uses type assertions to work around Drizzle's complex union types
 */
export declare class SimpleDatabaseAdapter {
    private db;
    readonly type: 'postgres' | 'd1';
    constructor(db: AnyDrizzleDB, type: 'postgres' | 'd1');
    /**
     * Get underlying Drizzle instance (for advanced use cases)
     */
    getDrizzle(): AnyDrizzleDB;
    /**
     * Select all records from table
     */
    select<T extends PgTable>(table: T): Promise<Array<T['$inferSelect']>>;
    /**
     * Select records matching condition
     */
    selectWhere<T extends PgTable>(table: T, condition: SQL): Promise<Array<T['$inferSelect']>>;
    /**
     * Select single record matching condition
     */
    selectOne<T extends PgTable>(table: T, condition: SQL): Promise<T['$inferSelect'] | undefined>;
    /**
     * Insert single record
     */
    insert<T extends PgTable>(table: T, values: T['$inferInsert']): Promise<T['$inferSelect']>;
    /**
     * Insert multiple records
     */
    insertMany<T extends PgTable>(table: T, values: T['$inferInsert'][]): Promise<T['$inferSelect'][]>;
    /**
     * Update records matching condition
     */
    update<T extends PgTable>(table: T, values: Partial<T['$inferInsert']>, condition: SQL): Promise<T['$inferSelect'][]>;
    /**
     * Update single record
     */
    updateOne<T extends PgTable>(table: T, values: Partial<T['$inferInsert']>, condition: SQL): Promise<T['$inferSelect'] | undefined>;
    /**
     * Delete records matching condition
     */
    delete<T extends PgTable>(table: T, condition: SQL): Promise<T['$inferSelect'][]>;
    /**
     * Delete single record
     */
    deleteOne<T extends PgTable>(table: T, condition: SQL): Promise<T['$inferSelect'] | undefined>;
    /**
     * Execute within a transaction
     */
    transaction<T>(callback: (adapter: SimpleDatabaseAdapter) => Promise<T>): Promise<T>;
}
/**
 * Create adapter from Drizzle instance
 */
export declare function createSimpleAdapter(db: AnyDrizzleDB, type: 'postgres' | 'd1'): SimpleDatabaseAdapter;
export type { SimpleDatabaseAdapter as IDatabaseAdapter };
//# sourceMappingURL=simple-adapter.d.ts.map