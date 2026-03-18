/**
 * Database Interface - Clean abstraction for database operations
 *
 * Provides a unified interface that works with both PostgreSQL and D1,
 * eliminating the TypeScript union type compatibility issues.
 */

import type {
  PgTable,
  PgSelectBuilder,
  PgInsertBuilder,
  PgUpdateBuilder,
  PgDeleteBuilder,
  PgSelectBase,
  BuildSubquerySelection,
  GetSelectTableSelection,
  GetSelectTableName,
} from 'drizzle-orm/pg-core';
import type { SQL, Subquery } from 'drizzle-orm';
import type * as schema from '../schema.js';

// =============================================================================
// SCHEMA TYPE
// =============================================================================

export type Schema = typeof schema;

// =============================================================================
// TABLE TYPE HELPERS
// =============================================================================

export type TableFromSchema<TName extends keyof Schema> = Schema[TName] extends PgTable
  ? Schema[TName]
  : never;

// =============================================================================
// QUERY INTERFACES
// =============================================================================

/**
 * Interface for database select operations
 */
export interface ISelectQuery<
  TTable extends PgTable,
  TSelection extends Record<string, unknown> = GetSelectTableSelection<TTable>,
  TAlias extends string | undefined = GetSelectTableName<TTable>
> {
  where(condition: SQL | undefined): this;
  orderBy(...columns: Array<{ asc(): SQL; desc(): SQL } | SQL>): this;
  limit(limit: number): this;
  offset(offset: number): this;
  then<TResult1 = Array<TSelection>, TResult2 = never>(
    onfulfilled?: ((value: Array<TSelection>) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): Promise<TResult1 | TResult2>;
}

/**
 * Interface for database insert operations
 */
export interface IInsertQuery<TTable extends PgTable, TValues> {
  values(values: TValues | TValues[]): this;
  returning(): this;
  then<TResult1 = Array<TValues>, TResult2 = never>(
    onfulfilled?: ((value: Array<TValues>) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): Promise<TResult1 | TResult2>;
}

/**
 * Interface for database update operations
 */
export interface IUpdateQuery<TTable extends PgTable, TValues> {
  set(values: Partial<TValues>): this;
  where(condition: SQL | undefined): this;
  returning(): this;
  then<TResult1 = Array<TValues>, TResult2 = never>(
    onfulfilled?: ((value: Array<TValues>) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): Promise<TResult1 | TResult2>;
}

/**
 * Interface for database delete operations
 */
export interface IDeleteQuery<TTable extends PgTable> {
  where(condition: SQL | undefined): this;
  returning(): this;
  then<TResult1 = Array<unknown>, TResult2 = never>(
    onfulfilled?: ((value: Array<unknown>) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): Promise<TResult1 | TResult2>;
}

// =============================================================================
// DATABASE INTERFACE
// =============================================================================

/**
 * Main database interface that abstracts PostgreSQL and D1 differences
 */
export interface IDatabase {
  /**
   * Start a select query
   */
  select<TTable extends PgTable>(
    from: TTable
  ): ISelectQuery<TTable>;

  /**
   * Start an insert query
   */
  insert<TTable extends PgTable, TValues = TTable['$inferInsert']>(
    into: TTable
  ): IInsertQuery<TTable, TValues>;

  /**
   * Start an update query
   */
  update<TTable extends PgTable, TValues = TTable['$inferInsert']>(
    table: TTable
  ): IUpdateQuery<TTable, TValues>;

  /**
   * Start a delete query
   */
  delete<TTable extends PgTable>(
    from: TTable
  ): IDeleteQuery<TTable>;

  /**
   * Raw SQL query execution
   */
  execute<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;

  /**
   * Transaction support
   */
  transaction<T>(callback: (db: IDatabase) => Promise<T>): Promise<T>;

  /**
   * Check connection health
   */
  ping(): Promise<boolean>;

  /**
   * Close connection (if applicable)
   */
  close?(): Promise<void>;
}

// =============================================================================
// DATABASE CONFIGURATION
// =============================================================================

export interface PostgresConfig {
  type: 'postgres';
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
}

export interface D1Config {
  type: 'd1';
  binding: D1Database;
}

export type DatabaseConfig = PostgresConfig | D1Config;

// =============================================================================
// QUERY HELPERS
// =============================================================================

/**
 * Type guard to check if a query is a select query
 */
export function isSelectQuery<T extends PgTable>(
  query: unknown
): query is ISelectQuery<T> {
  return (
    typeof query === 'object' &&
    query !== null &&
    'where' in query &&
    'orderBy' in query &&
    'limit' in query
  );
}
