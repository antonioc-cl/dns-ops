/**
 * DNS Ops Workbench - Database Client
 * 
 * Provides a shared Drizzle ORM client for the monorepo.
 * Supports both Cloudflare D1 (for Workers) and PostgreSQL (for local/collector).
 */

import { drizzle as drizzlePg, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleD1, type DrizzleD1Database } from 'drizzle-orm/d1';
import { Pool } from 'pg';
import * as schema from './schema/index.js';
import { type IDatabaseAdapter } from './database/simple-adapter.js';

// Export schema for convenience
export * from './schema/index.js';

// Re-export adapter types
export { type IDatabaseAdapter } from './database/simple-adapter.js';

// Database type - can be PostgreSQL or D1
export type Database = NodePgDatabase<typeof schema> | DrizzleD1Database<typeof schema>;
export type DbClient = Database;

// Environment configuration
export interface DBConfig {
  // PostgreSQL connection (for collector/local dev)
  connectionString?: string;
  
  // D1 binding (for Cloudflare Workers)
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
