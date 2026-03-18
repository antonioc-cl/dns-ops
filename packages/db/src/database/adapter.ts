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

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

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
  select<T extends PgTable>(
    table: T
  ): Promise<Array<T['$inferSelect']>>;

  selectWhere<T extends PgTable>(
    table: T,
    condition: SQL
  ): Promise<Array<T['$inferSelect']>>;

  selectOne<T extends PgTable>(
    table: T,
    condition: SQL
  ): Promise<T['$inferSelect'] | undefined>;

  /**
   * Insert operations
   */
  insert<T extends PgTable>(
    table: T,
    values: T['$inferInsert']
  ): Promise<T['$inferSelect']>;

  insertMany<T extends PgTable>(
    table: T,
    values: T['$inferInsert'][]
  ): Promise<T['$inferSelect'][]>;

  /**
   * Update operations
   */
  update<T extends PgTable>(
    table: T,
    values: Partial<T['$inferInsert']>,
    condition: SQL
  ): Promise<T['$inferSelect'][]>;

  updateOne<T extends PgTable>(
    table: T,
    values: Partial<T['$inferInsert']>,
    condition: SQL
  ): Promise<T['$inferSelect'] | undefined>;

  /**
   * Delete operations
   */
  delete<T extends PgTable>(
    table: T,
    condition: SQL
  ): Promise<T['$inferSelect'][]>;

  deleteOne<T extends PgTable>(
    table: T,
    condition: SQL
  ): Promise<T['$inferSelect'] | undefined>;

  /**
   * Transaction support
   */
  transaction<T>(callback: (adapter: IDatabaseAdapter) => Promise<T>): Promise<T>;

  /**
   * Health check
   */
  ping(): Promise<boolean>;
}

// =============================================================================
// POSTGRESQL ADAPTER
// =============================================================================

export class PostgresAdapter implements IDatabaseAdapter {
  readonly type = 'postgres' as const;

  constructor(private db: NodePgDatabase<Schema>) {}

  async query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    const result = await this.db.execute(sql, params);
    return {
      rows: result.rows as T[],
      rowCount: result.rowCount || 0,
    };
  }

  async select<T extends PgTable>(table: T): Promise<Array<T['$inferSelect']>> {
    return await this.db.select().from(table);
  }

  async selectWhere<T extends PgTable>(
    table: T,
    condition: SQL
  ): Promise<Array<T['$inferSelect']>> {
    return await this.db.select().from(table).where(condition);
  }

  async selectOne<T extends PgTable>(
    table: T,
    condition: SQL
  ): Promise<T['$inferSelect'] | undefined> {
    const results = await this.db.select().from(table).where(condition).limit(1);
    return results[0];
  }

  async insert<T extends PgTable>(
    table: T,
    values: T['$inferInsert']
  ): Promise<T['$inferSelect']> {
    const results = await this.db.insert(table).values(values).returning();
    return results[0];
  }

  async insertMany<T extends PgTable>(
    table: T,
    values: T['$inferInsert'][]
  ): Promise<T['$inferSelect'][]> {
    return await this.db.insert(table).values(values).returning();
  }

  async update<T extends PgTable>(
    table: T,
    values: Partial<T['$inferInsert']>,
    condition: SQL
  ): Promise<T['$inferSelect'][]> {
    return await this.db.update(table).set(values).where(condition).returning();
  }

  async updateOne<T extends PgTable>(
    table: T,
    values: Partial<T['$inferInsert']>,
    condition: SQL
  ): Promise<T['$inferSelect'] | undefined> {
    const results = await this.db
      .update(table)
      .set(values)
      .where(condition)
      .returning()
      .limit(1);
    return results[0];
  }

  async delete<T extends PgTable>(
    table: T,
    condition: SQL
  ): Promise<T['$inferSelect'][]> {
    return await this.db.delete(table).where(condition).returning();
  }

  async deleteOne<T extends PgTable>(
    table: T,
    condition: SQL
  ): Promise<T['$inferSelect'] | undefined> {
    const results = await this.db
      .delete(table)
      .where(condition)
      .returning()
      .limit(1);
    return results[0];
  }

  async transaction<T>(callback: (adapter: IDatabaseAdapter) => Promise<T>): Promise<T> {
    return await this.db.transaction(async (tx) => {
      const txAdapter = new PostgresAdapter(tx as NodePgDatabase<Schema>);
      return await callback(txAdapter);
    });
  }

  async ping(): Promise<boolean> {
    try {
      await this.db.execute('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}

// =============================================================================
// D1 ADAPTER
// =============================================================================

export class D1Adapter implements IDatabaseAdapter {
  readonly type = 'd1' as const;

  constructor(private db: DrizzleD1Database<Schema>) {}

  async query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    // D1 uses a different query interface
    const stmt = this.db.run(sql);
    const result = params ? await stmt.bind(...params) : await stmt;
    return {
      rows: result.results as T[],
      rowCount: result.meta?.changes || 0,
    };
  }

  async select<T extends PgTable>(table: T): Promise<Array<T['$inferSelect']>> {
    return await this.db.select().from(table).all();
  }

  async selectWhere<T extends PgTable>(
    table: T,
    condition: SQL
  ): Promise<Array<T['$inferSelect']>> {
    return await this.db.select().from(table).where(condition).all();
  }

  async selectOne<T extends PgTable>(
    table: T,
    condition: SQL
  ): Promise<T['$inferSelect'] | undefined> {
    return await this.db.select().from(table).where(condition).get();
  }

  async insert<T extends PgTable>(
    table: T,
    values: T['$inferInsert']
  ): Promise<T['$inferSelect']> {
    const result = await this.db.insert(table).values(values).returning().get();
    if (!result) throw new Error('Insert failed - no row returned');
    return result;
  }

  async insertMany<T extends PgTable>(
    table: T,
    values: T['$inferInsert'][]
  ): Promise<T['$inferSelect'][]> {
    return await this.db.insert(table).values(values).returning().all();
  }

  async update<T extends PgTable>(
    table: T,
    values: Partial<T['$inferInsert']>,
    condition: SQL
  ): Promise<T['$inferSelect'][]> {
    return await this.db.update(table).set(values).where(condition).returning().all();
  }

  async updateOne<T extends PgTable>(
    table: T,
    values: Partial<T['$inferInsert']>,
    condition: SQL
  ): Promise<T['$inferSelect'] | undefined> {
    return await this.db.update(table).set(values).where(condition).returning().get();
  }

  async delete<T extends PgTable>(
    table: T,
    condition: SQL
  ): Promise<T['$inferSelect'][]> {
    return await this.db.delete(table).where(condition).returning().all();
  }

  async deleteOne<T extends PgTable>(
    table: T,
    condition: SQL
  ): Promise<T['$inferSelect'] | undefined> {
    return await this.db.delete(table).where(condition).returning().get();
  }

  async transaction<T>(callback: (adapter: IDatabaseAdapter) => Promise<T>): Promise<T> {
    // D1 transactions are handled differently - may need batching
    // For now, execute without transaction wrapper
    // TODO: Implement proper D1 transaction support
    return await callback(this);
  }

  async ping(): Promise<boolean> {
    try {
      await this.db.run('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}

// =============================================================================
// ADAPTER FACTORY
// =============================================================================

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
export function createAdapter(
  db: NodePgDatabase<Schema> | DrizzleD1Database<Schema>,
  type: 'postgres' | 'd1'
): IDatabaseAdapter {
  if (type === 'postgres') {
    return new PostgresAdapter(db as NodePgDatabase<Schema>);
  } else {
    return new D1Adapter(db as DrizzleD1Database<Schema>);
  }
}
