/**
 * Base Repository
 *
 * Abstract base class for all repositories using the database adapter.
 * Provides common functionality and type safety.
 */

import { eq, desc, and, type SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import type { IDatabaseAdapter } from '../database/adapter.js';

export interface RepositoryOptions {
  tenantId?: string;
}

export abstract class BaseRepository<TTable extends PgTable> {
  constructor(
    protected db: IDatabaseAdapter,
    protected table: TTable,
    protected options: RepositoryOptions = {}
  ) {}

  /**
   * Find all records with optional filtering
   */
  async findAll(options?: {
    limit?: number;
    offset?: number;
    orderBy?: { column: keyof TTable; direction: 'asc' | 'desc' };
  }): Promise<Array<TTable['$inferSelect']>> {
    let query = this.db.select(this.table);

    if (options?.orderBy) {
      // Note: Order by requires column reference, simplified here
      // In practice, you'd pass the actual column reference
    }

    // Apply tenant filter if available
    if (this.options.tenantId && 'tenantId' in this.table) {
      // @ts-expect-error - tenantId filter
      query = query.where(eq(this.table.tenantId, this.options.tenantId));
    }

    return query;
  }

  /**
   * Find a single record by ID
   */
  async findById(id: string): Promise<TTable['$inferSelect'] | undefined> {
    // @ts-expect-error - id column exists on all tables
    return this.db.selectOne(this.table, eq(this.table.id, id));
  }

  /**
   * Find records matching a condition
   */
  async findWhere(
    condition: SQL,
    options?: { limit?: number }
  ): Promise<Array<TTable['$inferSelect']>> {
    const results = await this.db.selectWhere(this.table, condition);
    
    if (options?.limit) {
      return results.slice(0, options.limit);
    }
    
    return results;
  }

  /**
   * Find a single record matching a condition
   */
  async findOne(condition: SQL): Promise<TTable['$inferSelect'] | undefined> {
    return this.db.selectOne(this.table, condition);
  }

  /**
   * Create a new record
   */
  async create(data: TTable['$inferInsert']): Promise<TTable['$inferSelect']> {
    return this.db.insert(this.table, data);
  }

  /**
   * Create multiple records
   */
  async createMany(data: TTable['$inferInsert'][]): Promise<TTable['$inferSelect'][]> {
    return this.db.insertMany(this.table, data);
  }

  /**
   * Update a record by ID
   */
  async update(
    id: string,
    data: Partial<TTable['$inferInsert']>
  ): Promise<TTable['$inferSelect'] | undefined> {
    // @ts-expect-error - id column exists on all tables
    const results = await this.db.updateOne(
      this.table,
      data,
      // @ts-expect-error - id column exists on all tables
      eq(this.table.id, id)
    );
    return results;
  }

  /**
   * Update records matching a condition
   */
  async updateWhere(
    condition: SQL,
    data: Partial<TTable['$inferInsert']>
  ): Promise<TTable['$inferSelect'][]> {
    return this.db.update(this.table, data, condition);
  }

  /**
   * Delete a record by ID
   */
  async delete(id: string): Promise<TTable['$inferSelect'] | undefined> {
    // @ts-expect-error - id column exists on all tables
    return this.db.deleteOne(this.table, eq(this.table.id, id));
  }

  /**
   * Delete records matching a condition
   */
  async deleteWhere(condition: SQL): Promise<TTable['$inferSelect'][]> {
    return this.db.delete(this.table, condition);
  }

  /**
   * Execute within a transaction
   */
  async transaction<T>(callback: (repo: this) => Promise<T>): Promise<T> {
    return this.db.transaction(async () => callback(this));
  }
}
