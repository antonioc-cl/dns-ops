/**
 * Base Repository
 *
 * Abstract base class for all repositories using the database adapter.
 * Provides common functionality and type safety.
 */
import { type SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import type { IDatabaseAdapter } from '../database/simple-adapter.js';
export interface RepositoryOptions {
    tenantId?: string;
}
export declare abstract class BaseRepository<TTable extends PgTable> {
    protected db: IDatabaseAdapter;
    protected table: TTable;
    protected options: RepositoryOptions;
    constructor(db: IDatabaseAdapter, table: TTable, options?: RepositoryOptions);
    /**
     * Find all records with optional filtering
     */
    findAll(options?: {
        limit?: number;
        offset?: number;
        orderBy?: {
            column: keyof TTable;
            direction: 'asc' | 'desc';
        };
    }): Promise<Array<TTable['$inferSelect']>>;
    /**
     * Find a single record by ID
     */
    findById(id: string): Promise<TTable['$inferSelect'] | undefined>;
    /**
     * Find records matching a condition
     */
    findWhere(condition: SQL, options?: {
        limit?: number;
    }): Promise<Array<TTable['$inferSelect']>>;
    /**
     * Find a single record matching a condition
     */
    findOne(condition: SQL): Promise<TTable['$inferSelect'] | undefined>;
    /**
     * Create a new record
     */
    create(data: TTable['$inferInsert']): Promise<TTable['$inferSelect']>;
    /**
     * Create multiple records
     */
    createMany(data: TTable['$inferInsert'][]): Promise<TTable['$inferSelect'][]>;
    /**
     * Update a record by ID
     */
    update(id: string, data: Partial<TTable['$inferInsert']>): Promise<TTable['$inferSelect'] | undefined>;
    /**
     * Update records matching a condition
     */
    updateWhere(condition: SQL, data: Partial<TTable['$inferInsert']>): Promise<TTable['$inferSelect'][]>;
    /**
     * Delete a record by ID
     */
    delete(id: string): Promise<TTable['$inferSelect'] | undefined>;
    /**
     * Delete records matching a condition
     */
    deleteWhere(condition: SQL): Promise<TTable['$inferSelect'][]>;
    /**
     * Execute within a transaction
     */
    transaction<T>(callback: (repo: this) => Promise<T>): Promise<T>;
}
//# sourceMappingURL=base.d.ts.map