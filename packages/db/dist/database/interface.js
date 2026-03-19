/**
 * Database Interface - Clean abstraction for database operations
 *
 * Provides a unified interface that works with both PostgreSQL and D1,
 * eliminating the TypeScript union type compatibility issues.
 */
// =============================================================================
// QUERY HELPERS
// =============================================================================
/**
 * Type guard to check if a query is a select query
 */
export function isSelectQuery(query) {
    return (typeof query === 'object' &&
        query !== null &&
        'where' in query &&
        'orderBy' in query &&
        'limit' in query);
}
//# sourceMappingURL=interface.js.map