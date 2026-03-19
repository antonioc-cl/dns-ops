/**
 * DNS Ops Workbench - Database Client
 *
 * Provides a shared Drizzle ORM client for the monorepo.
 * Supports both Cloudflare D1 (for Workers) and PostgreSQL (for local/collector).
 */
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { type DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from './schema/index.js';
import { type IDatabaseAdapter } from './database/simple-adapter.js';
export * from './schema/index.js';
export { type IDatabaseAdapter } from './database/simple-adapter.js';
export type Database = NodePgDatabase<typeof schema> | DrizzleD1Database<typeof schema>;
export type DbClient = Database;
export interface DBConfig {
    connectionString?: string;
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