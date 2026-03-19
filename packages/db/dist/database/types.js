/**
 * Database Type Definitions
 *
 * Clean type definitions that eliminate the union type incompatibility issues
 * by using proper type discrimination.
 */
// =============================================================================
// TYPE GUARDS
// =============================================================================
export function isPostgresDatabase(db) {
    return db.__brand === 'postgres';
}
export function isD1Database(db) {
    return db.__brand === 'd1';
}
export function isPostgresConfig(config) {
    return config.type === 'postgres';
}
export function isD1Config(config) {
    return config.type === 'd1';
}
// =============================================================================
// TYPE ASSERTION HELPERS
// =============================================================================
/**
 * Assert that database is PostgreSQL
 */
export function asPostgres(db) {
    if (!isPostgresDatabase(db)) {
        throw new Error('Expected PostgreSQL database but received D1 database');
    }
    return db;
}
/**
 * Assert that database is D1
 */
export function asD1(db) {
    if (!isD1Database(db)) {
        throw new Error('Expected D1 database but received PostgreSQL database');
    }
    return db;
}
//# sourceMappingURL=types.js.map