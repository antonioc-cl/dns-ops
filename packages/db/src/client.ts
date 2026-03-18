/**
 * DNS Ops Workbench - Database Client
 * 
 * Provides a shared Drizzle ORM client for the monorepo.
 * Supports both Cloudflare D1 (for Workers) and PostgreSQL (for local/collector).
 */

import { drizzle as drizzlePg, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleD1, DrizzleD1Database } from 'drizzle-orm/d1';
import { Pool } from 'pg';
import * as schema from './schema.js';

// Export schema for convenience
export * from './schema.js';

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
