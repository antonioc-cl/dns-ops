/**
 * Service Auth Middleware
 *
 * Authentication middleware for the collector service.
 * Protects collector routes from arbitrary access.
 *
 * Authentication methods:
 * 1. Internal secret header (for web → collector calls)
 * 2. API key header (for external service access)
 * 3. Dev bypass (development only)
 *
 * Note: tenantId is normalized to UUID format for database compatibility.
 */
import type { Env } from '../types.js';
/**
 * Service auth middleware - populates auth context from various sources
 *
 * Priority:
 * 1. Internal secret (web → collector)
 * 2. API key (external services)
 * 3. Dev bypass (development only)
 *
 * Note: tenantId is normalized to UUID format for database compatibility.
 */
export declare const serviceAuthMiddleware: import("hono").MiddlewareHandler<Env, any, {}>;
/**
 * Require service auth middleware - rejects requests without valid authentication
 *
 * Note: tenantId is normalized to UUID format for database compatibility.
 */
export declare const requireServiceAuthMiddleware: import("hono").MiddlewareHandler<Env, any, {}>;
/**
 * Internal only middleware - for routes that should only be accessible
 * from internal services (web app)
 *
 * Note: tenantId is normalized to UUID format for database compatibility.
 */
export declare const internalOnlyMiddleware: import("hono").MiddlewareHandler<Env, any, {}>;
//# sourceMappingURL=auth.d.ts.map