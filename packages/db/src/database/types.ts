/**
 * Database Type Definitions
 *
 * Clean type definitions that eliminate the union type incompatibility issues
 * by using proper type discrimination.
 */

import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type * as schema from '../schema.js';

// =============================================================================
// SCHEMA TYPE
// =============================================================================

export type Schema = typeof schema;

// =============================================================================
// DATABASE TYPES (Tagged Unions for Type Safety)
// =============================================================================

export type PostgresDatabase = NodePgDatabase<Schema> & {
  readonly __brand: 'postgres';
};

export type D1Database = DrizzleD1Database<Schema> & {
  readonly __brand: 'd1';
};

export type AnyDatabase = PostgresDatabase | D1Database;

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

export interface D1DatabaseConfig {
  type: 'd1';
  binding: D1Database;
}

export type DatabaseConfig = PostgresConfig | D1DatabaseConfig;

// =============================================================================
// TYPE GUARDS
// =============================================================================

export function isPostgresDatabase(db: AnyDatabase): db is PostgresDatabase {
  return (db as PostgresDatabase).__brand === 'postgres';
}

export function isD1Database(db: AnyDatabase): db is D1Database {
  return (db as D1Database).__brand === 'd1';
}

export function isPostgresConfig(config: DatabaseConfig): config is PostgresConfig {
  return config.type === 'postgres';
}

export function isD1Config(config: DatabaseConfig): config is D1DatabaseConfig {
  return config.type === 'd1';
}

// =============================================================================
// TYPE ASSERTION HELPERS
// =============================================================================

/**
 * Assert that database is PostgreSQL
 */
export function asPostgres(db: AnyDatabase): PostgresDatabase {
  if (!isPostgresDatabase(db)) {
    throw new Error('Expected PostgreSQL database but received D1 database');
  }
  return db;
}

/**
 * Assert that database is D1
 */
export function asD1(db: AnyDatabase): D1Database {
  if (!isD1Database(db)) {
    throw new Error('Expected D1 database but received PostgreSQL database');
  }
  return db;
}
