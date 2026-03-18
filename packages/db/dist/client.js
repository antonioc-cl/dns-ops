/**
 * DNS Ops Workbench - Database Client
 *
 * Provides a shared Drizzle ORM client for the monorepo.
 * Supports both Cloudflare D1 (for Workers) and PostgreSQL (for local/collector).
 */
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleD1 } from 'drizzle-orm/d1';
import { Pool } from 'pg';
import * as schema from './schema';
// Export schema for convenience
export * from './schema';
/**
 * Create a database client based on environment
 */
export function createClient(config) {
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
export function createPostgresClient(connectionString) {
    const pool = new Pool({
        connectionString,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
    return drizzlePg(pool, { schema });
}
/**
 * Create a D1 client specifically (for Cloudflare Workers)
 */
export function createD1Client(d1Binding) {
    return drizzleD1(d1Binding, { schema });
}
//# sourceMappingURL=client.js.map