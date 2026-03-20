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
import { drizzle as drizzleD1 } from 'drizzle-orm/d1';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema/index.js';
// Export schema for convenience
export * from './schema/index.js';
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
        // In production, require proper TLS configuration
        ssl: process.env.NODE_ENV === 'production'
            ? {
                // Production: require valid TLS certificates
                // SECURITY TODO: Configure proper TLS certificates
                // Options:
                // 1. Use CA certificate: Set DB_TLS_CA_CERT env var with path to cert file
                // 2. Use key file: Set DB_TLS_KEY env var with path to key file
                // 3. Use system CA store: Set DB_TLS_REJECT_UNAUTHORIZED=true
                rejectUnauthorized: process.env.DB_TLS_REJECT_UNAUTHORIZED !== 'false',
            }
            : {
                // Development: allow self-signed certificates for local development
                rejectUnauthorized: false,
            },
    });
    return drizzlePg(pool, { schema });
}
/**
 * Create a D1 client specifically (for Cloudflare Workers)
 */
export function createD1Client(d1Binding) {
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
export function createAdapterFromConfig(config) {
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
export function createPostgresAdapter(connectionString) {
    const pool = new Pool({
        connectionString,
        // In production, require proper TLS configuration
        ssl: process.env.NODE_ENV === 'production'
            ? {
                // Production: require valid TLS certificates
                // SECURITY TODO: Configure proper TLS certificates
                // Options:
                // 1. Use CA certificate: Set DB_TLS_CA_CERT env var with path to cert file
                // 2. Use key file: Set DB_TLS_KEY env var with path to key file
                // 3. Use system CA store: Set DB_TLS_REJECT_UNAUTHORIZED=true
                rejectUnauthorized: process.env.DB_TLS_REJECT_UNAUTHORIZED !== 'false',
            }
            : {
                // Development: allow self-signed certificates for local development
                rejectUnauthorized: false,
            },
    });
    const db = drizzlePg(pool, { schema });
    return createSimpleAdapter(db, 'postgres');
}
/**
 * Create a D1 adapter (for Cloudflare Workers)
 */
export function createD1Adapter(d1Binding) {
    const db = drizzleD1(d1Binding, { schema });
    return createSimpleAdapter(db, 'd1');
}
//# sourceMappingURL=client.js.map