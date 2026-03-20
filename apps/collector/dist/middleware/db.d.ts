/**
 * Database Middleware
 *
 * Sets up database context for collector routes.
 * Creates a PostgreSQL adapter and attaches it to the Hono context.
 */
import type { Env } from '../types.js';
/**
 * Database middleware - attaches DB adapter to context
 *
 * Requires DATABASE_URL environment variable to be set.
 * Returns 500 error if database is not configured or connection fails.
 */
export declare const dbMiddleware: import("hono").MiddlewareHandler<Env, any, {}>;
/**
 * Database middleware with validation - fails on startup if misconfigured
 *
 * Use this for strict environments where DB must be available.
 * Throws error instead of returning JSON response.
 */
export declare const dbMiddlewareStrict: import("hono").MiddlewareHandler<Env, any, {}>;
//# sourceMappingURL=db.d.ts.map