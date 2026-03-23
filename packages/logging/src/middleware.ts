/**
 * Logging Middleware - Bead 14.1
 *
 * Hono middleware for automatic request logging with context injection.
 */

import type { MiddlewareHandler } from 'hono';
import {
  generateRequestId,
  getDurationMs,
  type RequestLogContext,
  runWithContext,
} from './context.js';
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
export function createLoggingMiddleware(options: LoggingMiddlewareOptions): MiddlewareHandler {
  const {
    logger,
    skipPaths = ['/health', '/healthz', '/ready'],
    getTenantId,
    getActorId,
  } = options;

  return async (c, next) => {
    const path = c.req.path;

    // Skip logging for certain paths
    if (skipPaths.some((p) => path === p || path.startsWith(`${p}/`))) {
      return next();
    }

    const requestId = c.req.header('X-Request-Id') || generateRequestId();
    const method = c.req.method;
    const tenantId = getTenantId?.(c) || c.get('tenantId');
    const actorId = getActorId?.(c) || c.get('actorId');

    // Create request-scoped logger
    const requestLogger = logger.forRequest({
      requestId,
      method,
      path,
      tenantId,
      actorId,
    });

    // Create request context
    const context: RequestLogContext = {
      logger: requestLogger,
      requestId,
      tenantId,
      actorId,
      startTime: Date.now(),
      metadata: {},
    };

    // Set request ID header for tracing
    c.header('X-Request-Id', requestId);

    // Make logger available in Hono context
    c.set('logger' as never, requestLogger);
    c.set('requestId' as never, requestId);

    // Run request within logging context
    return runWithContext(context, async () => {
      requestLogger.requestStart(method, path);

      try {
        await next();
      } catch (error) {
        const durationMs = getDurationMs(context);
        requestLogger.error('Request failed', error, { durationMs });
        throw error;
      }

      const durationMs = getDurationMs(context);
      requestLogger.requestEnd(c.res.status, durationMs);
    });
  };
}

/**
 * Type augmentation for Hono context
 */
declare module 'hono' {
  interface ContextVariableMap {
    logger: Logger;
    requestId: string;
  }
}
