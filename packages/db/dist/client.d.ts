/**
 * DNS Ops Workbench - Database Client
 *
 * Provides a shared Drizzle ORM client for the monorepo.
 * Supports both Cloudflare D1 (for Workers) and PostgreSQL (for local/collector).
 */
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from './schema';
export * from './schema';
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
//# sourceMappingURL=client.d.ts.map