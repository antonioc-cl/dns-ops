/**
 * Database Type Definitions
 *
 * Clean type definitions that eliminate the union type incompatibility issues
 * by using proper type discrimination.
 */
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type * as schemaModule from '../schema/index.js';
type Schema = typeof schemaModule;
export type PostgresDatabase = NodePgDatabase<Schema> & {
    readonly __brand: 'postgres';
};
export type D1DatabaseType = DrizzleD1Database<Schema> & {
    readonly __brand: 'd1';
};
export type AnyDatabase = PostgresDatabase | D1DatabaseType;
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
export declare function isPostgresDatabase(db: AnyDatabase): db is PostgresDatabase;
export declare function isD1Database(db: AnyDatabase): db is D1DatabaseType;
export declare function isPostgresConfig(config: DatabaseConfig): config is PostgresConfig;
export declare function isD1Config(config: DatabaseConfig): config is D1DatabaseConfig;
/**
 * Assert that database is PostgreSQL
 */
export declare function asPostgres(db: AnyDatabase): PostgresDatabase;
/**
 * Assert that database is D1
 */
export declare function asD1(db: AnyDatabase): D1DatabaseType;
export {};
//# sourceMappingURL=types.d.ts.map