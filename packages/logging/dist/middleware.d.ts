/**
 * Logging Middleware - Bead 14.1
 *
 * Hono middleware for automatic request logging with context injection.
 */
import type { MiddlewareHandler } from 'hono';
import type { Logger } from './logger.js';
/**
 * Options for the logging middleware
 */
export interface LoggingMiddlewareOptions {
    /** Logger instance to use */
    logger: Logger;
    /** Skip logging for certain paths (e.g., health checks) */
    skipPaths?: string[];
    /** Custom function to extract tenant ID from context */
    getTenantId?: (c: Parameters<MiddlewareHandler>[0]) => string | undefined;
    /** Custom function to extract actor ID from context */
    getActorId?: (c: Parameters<MiddlewareHandler>[0]) => string | undefined;
}
/**
 * Create logging middleware for Hono
 *
 * This middleware:
 * 1. Generates a unique request ID
 * 2. Creates a request-scoped logger with context
 * 3. Logs request start and completion
 * 4. Injects logger into Hono context for route handlers
 */
export declare function createLoggingMiddleware(options: LoggingMiddlewareOptions): MiddlewareHandler;
/**
 * Type augmentation for Hono context
 */
declare module 'hono' {
    interface ContextVariableMap {
        logger: Logger;
        requestId: string;
    }
}
//# sourceMappingURL=middleware.d.ts.map