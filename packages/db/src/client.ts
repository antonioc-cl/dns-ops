/**
 * DNS Ops Workbench - Database Client
 *
 * Provides a shared Drizzle ORM client for the monorepo.
 *
 * TOPOLOGY (see docs/architecture/runtime-topology.md):
 * - PostgreSQL is the single authoritative data store
 * - Web app (Cloudflare Workers) connects via Hyperdrive
 * - Collector (Node.js) connects directly to PostgreSQL
 * - Local dev uses PostgreSQL for both runtimes
 *
 * D1 is NOT used for product data. Legacy D1 support is retained
 * for potential edge caching but should not be used for authoritative data.
 */

import { type DrizzleD1Database, drizzle as drizzleD1 } from 'drizzle-orm/d1';
import { drizzle as drizzlePg, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { IDatabaseAdapter } from './database/simple-adapter.js';
import * as schema from './schema/index.js';

// Re-export adapter types
export type { IDatabaseAdapter } from './database/simple-adapter.js';
// Export schema for convenience
export * from './schema/index.js';

// Database type - PostgreSQL is authoritative, D1 only for edge caching
export type Database = NodePgDatabase<typeof schema> | DrizzleD1Database<typeof schema>;
export type DbClient = Database;

// Environment configuration
export interface DBConfig {
  /**
   * PostgreSQL connection string
   *
   * Used by:
   * - Collector (Node.js): Direct DATABASE_URL
   * - Web (Cloudflare Workers): Hyperdrive connection string
   * - Local dev: localhost PostgreSQL
   */
  connectionString?: string;

  /**
   * D1 binding (DEPRECATED for product data)
   *
   * D1 should only be used for edge caching, not authoritative data.
   * See docs/architecture/runtime-topology.md
   */
  d1Binding?: D1Database;
}

/**
 * Create a database client based on environment
 */
export function createClient(config: DBConfig): Database {
  // Use D1 if binding is provided (Cloudflare Workers)
  if (config.d1Binding) {
    return drizzleD1(config.d1Binding, { schema });
  }

  // Otherwise use PostgreSQL
  if (!config.connectionString) {
    throw new Error('Either d1Binding or connectionString must be provided');
  }

  const pool = new Pool({
    connectionString: config.connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  return drizzlePg(pool, { schema });
}

/**
 * Create a PostgreSQL client specifically (for collector)
 */
export function createPostgresClient(connectionString: string): NodePgDatabase<typeof schema> {
  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  return drizzlePg(pool, { schema });
}

/**
 * Create a D1 client specifically (for Cloudflare Workers)
 */
export function createD1Client(d1Binding: D1Database): DrizzleD1Database<typeof schema> {
  return drizzleD1(d1Binding, { schema });
}

// =============================================================================
// ADAPTER FACTORIES (RECOMMENDED APPROACH)
// =============================================================================

import { createSimpleAdapter } from './database/simple-adapter.js';

/**
 * Create a database adapter based on environment
 *
 * This is the recommended approach - it returns an IDatabaseAdapter
 * that abstracts away PostgreSQL vs D1 differences.
 */
export function createAdapterFromConfig(config: DBConfig): IDatabaseAdapter {
  // Use D1 if binding is provided (Cloudflare Workers)
  if (config.d1Binding) {
    const db = drizzleD1(config.d1Binding, { schema });
    return createSimpleAdapter(db, 'd1');
  }

  // Otherwise use PostgreSQL
  if (!config.connectionString) {
    throw new Error('Either d1Binding or connectionString must be provided');
  }

  const pool = new Pool({
    connectionString: config.connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  const db = drizzlePg(pool, { schema });
  return createSimpleAdapter(db, 'postgres');
}

/**
 * Create a PostgreSQL adapter (for collector)
 */
export function createPostgresAdapter(connectionString: string): IDatabaseAdapter {
  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  const db = drizzlePg(pool, { schema });
  return createSimpleAdapter(db, 'postgres');
}

/**
 * Create a D1 adapter (for Cloudflare Workers)
 */
export function createD1Adapter(d1Binding: D1Database): IDatabaseAdapter {
  const db = drizzleD1(d1Binding, { schema });
  return createSimpleAdapter(db, 'd1');
}
