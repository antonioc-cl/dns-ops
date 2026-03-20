/**
 * Database Middleware
 *
 * Sets up database context for collector routes.
 * Creates a PostgreSQL adapter and attaches it to the Hono context.
 */
import { createPostgresAdapter } from '@dns-ops/db';
import { createMiddleware } from 'hono/factory';
/**
 * Database middleware - attaches DB adapter to context
 *
 * Requires DATABASE_URL environment variable to be set.
 * Returns 500 error if database is not configured or connection fails.
 */
export const dbMiddleware = createMiddleware(async (c, next) => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.error('DATABASE_URL environment variable is not set');
        return c.json({
            error: 'Database configuration error',
            message: 'DATABASE_URL not configured',
        }, 500);
    }
    try {
        const adapter = createPostgresAdapter(databaseUrl);
        c.set('db', adapter);
    }
    catch (error) {
        console.error('Failed to create database adapter:', error);
        return c.json({
            error: 'Database connection error',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, 500);
    }
    return next();
});
/**
 * Database middleware with validation - fails on startup if misconfigured
 *
 * Use this for strict environments where DB must be available.
 * Throws error instead of returning JSON response.
 */
export const dbMiddlewareStrict = createMiddleware(async (c, next) => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable is required but not set');
    }
    const adapter = createPostgresAdapter(databaseUrl);
    c.set('db', adapter);
    return next();
});
//# sourceMappingURL=db.js.map