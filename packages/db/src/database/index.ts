/**
 * Database Module
 *
 * Clean database abstraction that works with both PostgreSQL and D1.
 * Provides type-safe operations without union type incompatibility issues.
 */

export {
  PostgresAdapter,
  D1Adapter,
  createAdapter,
  type IDatabaseAdapter,
  type QueryResult,
  type ConnectionConfig,
  type PostgresConnectionConfig,
  type D1ConnectionConfig,
} from './adapter.js';

export {
  type Schema,
  type PostgresConfig,
  type D1DatabaseConfig,
  type DatabaseConfig,
  isPostgresDatabase,
  isD1Database,
  isPostgresConfig,
  isD1Config,
  asPostgres,
  asD1,
} from './types.js';
