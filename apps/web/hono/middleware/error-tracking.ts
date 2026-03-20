/**
 * Error Tracking Middleware - Bead 14.2
 *
 * Captures route/component/runtime failures with structured logging
 * and optional external error tracking service integration.
 */

import { createLogger, createLoggingMiddleware, type Logger } from '@dns-ops/logging';
import type { ErrorHandler, NotFoundHandler } from 'hono';
import { createMiddleware } from 'hono/factory';
import type { Env } from '../types.js';

/**
 * Configuration for error tracking
 */
export interface ErrorTrackingConfig {
  /** Service name for logs */
  service?: string;
  /** Version for logs */
  version?: string;
  /** External error reporting hook */
  onError?: (error: Error, context: ErrorContext) => void | Promise<void>;
  /** Paths to skip logging for (e.g. health checks) */
  skipPaths?: string[];
}

/**
 * Error context passed to error handlers
 */
export interface ErrorContext {
  requestId: string;
  method: string;
  path: string;
  tenantId?: string;
  actorId?: string;
  statusCode?: number;
  userAgent?: string;
}

// Singleton logger for the web service
let webLogger: Logger | undefined;

/**
 * Get the web service logger
 */
export function getWebLogger(): Logger {
  if (!webLogger) {
    const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';
    webLogger = createLogger({
      service: 'dns-ops-web',
      version: '0.1.0',
      minLevel: isDev ? 'debug' : 'info',
      pretty: isDev,
    });
  }
  return webLogger;
}

/**
 * Create request logging middleware
 * Logs all requests with context (requestId, tenant, actor, duration)
 */
export function createRequestLoggingMiddleware(config: ErrorTrackingConfig = {}) {
  const { skipPaths = ['/api/health', '/health', '/healthz'] } = config;
  const logger = getWebLogger();

  return createLoggingMiddleware({
    logger,
    skipPaths,
    getTenantId: (c) => c.get('tenantId'),
    getActorId: (c) => c.get('actorId'),
  });
}

/**
 * Error tracking middleware
 * Wraps route handlers to capture and log errors with context
 */
export function createErrorTrackingMiddleware(config: ErrorTrackingConfig = {}) {
  const logger = getWebLogger();

  return createMiddleware<Env>(async (c, next) => {
    const requestId = c.get('requestId') || `req_${Date.now().toString(36)}`;
    const startTime = Date.now();

    try {
      await next();
    } catch (error) {
      const durationMs = Date.now() - startTime;

      const context: ErrorContext = {
        requestId,
        method: c.req.method,
        path: c.req.path,
        tenantId: c.get('tenantId'),
        actorId: c.get('actorId'),
        userAgent: c.req.header('User-Agent'),
      };

      // Log the error
      if (error instanceof Error) {
        logger.error(`Request failed: ${error.message}`, error, {
          ...context,
          durationMs,
        });

        // Call external error hook if configured
        if (config.onError) {
          try {
            await config.onError(error, context);
          } catch (hookError) {
            logger.warn('Error in onError hook', {
              hookError: hookError instanceof Error ? hookError.message : String(hookError),
            });
          }
        }
      } else {
        logger.error('Request failed with non-Error', undefined, {
          ...context,
          durationMs,
          errorType: typeof error,
          errorValue: String(error),
        });
      }

      // Re-throw to let Hono's error handler deal with the response
      throw error;
    }
  });
}

/**
 * Global error handler for Hono
 * Returns consistent JSON error responses
 */
export function createErrorHandler(config: ErrorTrackingConfig = {}): ErrorHandler<Env> {
  const logger = getWebLogger();

  return (error, c) => {
    const requestId = c.get('requestId') || 'unknown';
    const statusCode = 'status' in error && typeof error.status === 'number' ? error.status : 500;

    const context: ErrorContext = {
      requestId,
      method: c.req.method,
      path: c.req.path,
      tenantId: c.get('tenantId'),
      actorId: c.get('actorId'),
      statusCode,
    };

    // Only log 5xx errors at error level (4xx are expected/normal)
    if (statusCode >= 500) {
      logger.error(`Unhandled error: ${error.message}`, error, context);

      // Call external error hook
      if (config.onError) {
        Promise.resolve(config.onError(error, context)).catch((hookError) => {
          logger.warn('Error in onError hook', {
            hookError: hookError instanceof Error ? hookError.message : String(hookError),
          });
        });
      }
    } else {
      logger.info(`Client error: ${error.message}`, context);
    }

    return c.json(
      {
        error: statusCode >= 500 ? 'Internal Server Error' : error.message,
        requestId,
        ...(process.env.NODE_ENV === 'development' && statusCode >= 500
          ? { stack: error.stack }
          : {}),
      },
      statusCode as 500
    );
  };
}

/**
 * Not found handler for Hono
 */
export function createNotFoundHandler(): NotFoundHandler<Env> {
  const logger = getWebLogger();

  return (c) => {
    const requestId = c.get('requestId') || 'unknown';

    logger.info('Not found', {
      requestId,
      method: c.req.method,
      path: c.req.path,
    });

    return c.json(
      {
        error: 'Not Found',
        path: c.req.path,
        requestId,
      },
      404
    );
  };
}

/**
 * Track an error manually (for non-middleware contexts)
 */
export function trackError(error: Error, context?: Partial<ErrorContext>): void {
  const logger = getWebLogger();
  logger.error(`Tracked error: ${error.message}`, error, context || {});
}

/**
 * Track a warning (e.g., deprecated API usage, validation issues)
 */
export function trackWarning(message: string, context?: Record<string, unknown>): void {
  const logger = getWebLogger();
  logger.warn(message, context || {});
}

/**
 * Track an informational event
 */
export function trackInfo(message: string, context?: Record<string, unknown>): void {
  const logger = getWebLogger();
  logger.info(message, context || {});
}
