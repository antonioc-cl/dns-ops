/**
 * Database Adapter - Clean abstraction for database operations
 *
 * Wraps Drizzle ORM instances and provides type-safe operations
 * that work consistently across PostgreSQL and D1.
 */
import type { SQL } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type { PgTable } from 'drizzle-orm/pg-core';
import type * as schema from '../schema.js';
type Schema = typeof schema;
/**
 * Query result type - unified across PostgreSQL and D1
 */
export interface QueryResult<T = unknown> {
    rows: T[];
    rowCount: number;
}
/**
 * Database adapter interface - abstracts PostgreSQL and D1 differences
 */
export interface IDatabaseAdapter {
    /**
     * Database type identifier
     */
    readonly type: 'postgres' | 'd1';
    /**
     * Raw query execution - for complex queries
     */
    query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
    /**
     * Select operations
     */
    select<T extends PgTable>(table: T): Promise<Array<T['$inferSelect']>>;
    selectWhere<T extends PgTable>(table: T, condition: SQL): Promise<Array<T['$inferSelect']>>;
    selectOne<T extends PgTable>(table: T, condition: SQL): Promise<T['$inferSelect'] | undefined>;
    /**
     * Insert operations
     */
    insert<T extends PgTable>(table: T, values: T['$inferInsert']): Promise<T['$inferSelect']>;
    insertMany<T extends PgTable>(table: T, values: T['$inferInsert'][]): Promise<T['$inferSelect'][]>;
    /**
     * Update operations
     */
    update<T extends PgTable>(table: T, values: Partial<T['$inferInsert']>, condition: SQL): Promise<T['$inferSelect'][]>;
    updateOne<T extends PgTable>(table: T, values: Partial<T['$inferInsert']>, condition: SQL): Promise<T['$inferSelect'] | undefined>;
    /**
     * Delete operations
     */
    delete<T extends PgTable>(table: T, condition: SQL): Promise<T['$inferSelect'][]>;
    deleteOne<T extends PgTable>(table: T, condition: SQL): Promise<T['$inferSelect'] | undefined>;
    /**
     * Transaction support
     */
    transaction<T>(callback: (adapter: IDatabaseAdapter) => Promise<T>): Promise<T>;
    /**
     * Health check
     */
    ping(): Promise<boolean>;
}
export declare class PostgresAdapter implements IDatabaseAdapter {
    private db;
    readonly type: "postgres";
    constructor(db: NodePgDatabase<Schema>);
    query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
    select<T extends PgTable>(table: T): Promise<Array<T['$inferSelect']>>;
    selectWhere<T extends PgTable>(table: T, condition: SQL): Promise<Array<T['$inferSelect']>>;
    selectOne<T extends PgTable>(table: T, condition: SQL): Promise<T['$inferSelect'] | undefined>;
    insert<T extends PgTable>(table: T, values: T['$inferInsert']): Promise<T['$inferSelect']>;
    insertMany<T extends PgTable>(table: T, values: T['$inferInsert'][]): Promise<T['$inferSelect'][]>;
    update<T extends PgTable>(table: T, values: Partial<T['$inferInsert']>, condition: SQL): Promise<T['$inferSelect'][]>;
    updateOne<T extends PgTable>(table: T, values: Partial<T['$inferInsert']>, condition: SQL): Promise<T['$inferSelect'] | undefined>;
    delete<T extends PgTable>(table: T, condition: SQL): Promise<T['$inferSelect'][]>;
    deleteOne<T extends PgTable>(table: T, condition: SQL): Promise<T['$inferSelect'] | undefined>;
    transaction<T>(callback: (adapter: IDatabaseAdapter) => Promise<T>): Promise<T>;
    ping(): Promise<boolean>;
}
export declare class D1Adapter implements IDatabaseAdapter {
    private db;
    readonly type: "d1";
    constructor(db: DrizzleD1Database<Schema>);
    query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
    select<T extends PgTable>(table: T): Promise<Array<T['$inferSelect']>>;
    selectWhere<T extends PgTable>(table: T, condition: SQL): Promise<Array<T['$inferSelect']>>;
    selectOne<T extends PgTable>(table: T, condition: SQL): Promise<T['$inferSelect'] | undefined>;
    insert<T extends PgTable>(table: T, values: T['$inferInsert']): Promise<T['$inferSelect']>;
    insertMany<T extends PgTable>(table: T, values: T['$inferInsert'][]): Promise<T['$inferSelect'][]>;
    update<T extends PgTable>(table: T, values: Partial<T['$inferInsert']>, condition: SQL): Promise<T['$inferSelect'][]>;
    updateOne<T extends PgTable>(table: T, values: Partial<T['$inferInsert']>, condition: SQL): Promise<T['$inferSelect'] | undefined>;
    delete<T extends PgTable>(table: T, condition: SQL): Promise<T['$inferSelect'][]>;
    deleteOne<T extends PgTable>(table: T, condition: SQL): Promise<T['$inferSelect'] | undefined>;
    transaction<T>(callback: (adapter: IDatabaseAdapter) => Promise<T>): Promise<T>;
    ping(): Promise<boolean>;
}
export interface PostgresConnectionConfig {
    type: 'postgres';
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl?: boolean;
}
export interface D1ConnectionConfig {
    type: 'd1';
    binding: D1Database;
}
export type ConnectionConfig = PostgresConnectionConfig | D1ConnectionConfig;
/**
 * Create appropriate database adapter based on configuration
 */
export declare function createAdapter(db: NodePgDatabase<Schema> | DrizzleD1Database<Schema>, type: 'postgres' | 'd1'): IDatabaseAdapter;
export {};
//# sourceMappingURL=adapter.d.ts.map