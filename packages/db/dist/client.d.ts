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
import { type DrizzleD1Database } from 'drizzle-orm/d1';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { IDatabaseAdapter } from './database/simple-adapter.js';
import * as schema from './schema/index.js';
export type { IDatabaseAdapter } from './database/simple-adapter.js';
export * from './schema/index.js';
export type Database = NodePgDatabase<typeof schema> | DrizzleD1Database<typeof schema>;
export type DbClient = Database;
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
export declare function createClient(config: DBConfig): Database;
/**
 * Create a PostgreSQL client specifically (for collector)
 */
export declare function createPostgresClient(connectionString: string): NodePgDatabase<typeof schema>;
/**
 * Create a D1 client specifically (for Cloudflare Workers)
 */
export declare function createD1Client(d1Binding: D1Database): DrizzleD1Database<typeof schema>;
/**
 * Create a database adapter based on environment
 *
 * This is the recommended approach - it returns an IDatabaseAdapter
 * that abstracts away PostgreSQL vs D1 differences.
 */
export declare function createAdapterFromConfig(config: DBConfig): IDatabaseAdapter;
/**
 * Create a PostgreSQL adapter (for collector)
 */
export declare function createPostgresAdapter(connectionString: string): IDatabaseAdapter;
/**
 * Create a D1 adapter (for Cloudflare Workers)
 */
export declare function createD1Adapter(d1Binding: D1Database): IDatabaseAdapter;
//# sourceMappingURL=client.d.ts.map