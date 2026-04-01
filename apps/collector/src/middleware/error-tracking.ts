/**
 * Error Tracking Middleware - Bead 14.3
 *
 * Captures job, route, probe, and collection failures in the collector runtime.
 * Provides structured logging with context for debugging and monitoring.
 */

import { createLogger, createLoggingMiddleware, type Logger } from '@dns-ops/logging';
import type { ErrorHandler, NotFoundHandler } from 'hono';
import { createMiddleware } from 'hono/factory';
import type { Env } from '../types.js';

/**
 * Error context for tracking
 */
export interface ErrorContext {
  requestId?: string;
  method?: string;
  path?: string;
  tenantId?: string;
  actorId?: string;
  statusCode?: number;
  jobId?: string;
  jobType?: string;
  domain?: string;
  probeType?: string;
  [key: string]: unknown;
}

/**
 * Configuration for error tracking
 */
export interface ErrorTrackingConfig {
  service?: string;
  version?: string;
  onError?: (error: Error, context: ErrorContext) => void | Promise<void>;
  skipPaths?: string[];
}

// Singleton logger for the collector service
let collectorLogger: Logger | undefined;

/**
 * Get the collector service logger
 */
export function getCollectorLogger(): Logger {
  if (!collectorLogger) {
    const isDev = process.env.NODE_ENV === 'development';
    collectorLogger = createLogger({
      service: 'dns-ops-collector',
      version: '0.1.0',
      minLevel: isDev ? 'debug' : 'info',
      pretty: isDev,
    });
  }
  return collectorLogger;
}

/**
 * Create request logging middleware
 */
export function createRequestLoggingMiddleware(config: ErrorTrackingConfig = {}) {
  const { skipPaths = ['/health', '/healthz', '/ready'] } = config;
  const logger = getCollectorLogger();

  return createLoggingMiddleware({
    logger,
    skipPaths,
    getTenantId: (c) => c.get('tenantId'),
    getActorId: (c) => c.get('actorId'),
  });
}

/**
 * Error tracking middleware for routes
 */
export function createErrorTrackingMiddleware(config: ErrorTrackingConfig = {}) {
  const logger = getCollectorLogger();

  return createMiddleware<Env>(async (c, next) => {
    const requestId =
      c.req.header('X-Request-Id') ||
      `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
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
      };

      if (error instanceof Error) {
        logger.error(`Request failed: ${error.message}`, error, {
          ...context,
          durationMs,
        });

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

      throw error;
    }
  });
}

/**
 * Global error handler for Hono
 */
export function createErrorHandler(config: ErrorTrackingConfig = {}): ErrorHandler<Env> {
  const logger = getCollectorLogger();

  return (error, c) => {
    const requestId = c.req.header('X-Request-Id') || 'unknown';
    const statusCode = 'status' in error && typeof error.status === 'number' ? error.status : 500;

    const context: ErrorContext = {
      requestId,
      method: c.req.method,
      path: c.req.path,
      tenantId: c.get('tenantId'),
      actorId: c.get('actorId'),
      statusCode,
    };

    if (statusCode >= 500) {
      logger.error(`Unhandled error: ${error.message}`, error, context);

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
 * Not found handler
 */
export function createNotFoundHandler(): NotFoundHandler<Env> {
  const logger = getCollectorLogger();

  return (c) => {
    const requestId = c.req.header('X-Request-Id') || 'unknown';

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
 * Track a job error
 */
export function trackJobError(
  error: Error,
  context: { jobId: string; jobType: string; domain?: string; [key: string]: unknown }
): void {
  const logger = getCollectorLogger();
  logger.error(`Job failed: ${error.message}`, error, {
    ...context,
    errorType: 'job_failure',
  });
}

/**
 * Track a job start
 */
export function trackJobStart(context: {
  jobId: string;
  jobType: string;
  domain?: string;
  [key: string]: unknown;
}): void {
  const logger = getCollectorLogger();
  logger.info('Job started', {
    ...context,
    eventType: 'job_start',
  });
}

/**
 * Track a job completion
 */
export function trackJobComplete(context: {
  jobId: string;
  jobType: string;
  domain?: string;
  durationMs: number;
  result?: string;
  [key: string]: unknown;
}): void {
  const logger = getCollectorLogger();
  logger.info('Job completed', {
    ...context,
    eventType: 'job_complete',
  });
}

/**
 * Track a probe error
 */
export function trackProbeError(
  error: Error,
  context: { probeType: string; hostname: string; port?: number; [key: string]: unknown }
): void {
  const logger = getCollectorLogger();
  logger.error(`Probe failed: ${error.message}`, error, {
    ...context,
    errorType: 'probe_failure',
  });
}

/**
 * Track a probe result
 */
export function trackProbeResult(context: {
  probeType: string;
  hostname: string;
  port?: number;
  success: boolean;
  responseTimeMs: number;
  [key: string]: unknown;
}): void {
  const logger = getCollectorLogger();
  const level = context.success ? 'info' : 'warn';
  logger[level]('Probe completed', {
    ...context,
    eventType: 'probe_result',
  });
}

/**
 * Track a collection error
 */
export function trackCollectionError(
  error: Error,
  context: { domain: string; snapshotId?: string; [key: string]: unknown }
): void {
  const logger = getCollectorLogger();
  logger.error(`Collection failed: ${error.message}`, error, {
    ...context,
    errorType: 'collection_failure',
  });
}

/**
 * Track a collection result
 */
export function trackCollectionResult(context: {
  domain: string;
  snapshotId: string;
  recordCount: number;
  durationMs: number;
  resultState: string;
  [key: string]: unknown;
}): void {
  const logger = getCollectorLogger();
  logger.info('Collection completed', {
    ...context,
    eventType: 'collection_result',
  });
}

/**
 * Track a generic error
 */
export function trackError(error: Error, context?: Partial<ErrorContext>): void {
  const logger = getCollectorLogger();
  logger.error(`Tracked error: ${error.message}`, error, context || {});
}

/**
 * Track a warning
 */
export function trackWarning(message: string, context?: Record<string, unknown>): void {
  const logger = getCollectorLogger();
  logger.warn(message, context || {});
}

/**
 * Track an info event
 */
export function trackInfo(message: string, context?: Record<string, unknown>): void {
  const logger = getCollectorLogger();
  logger.info(message, context || {});
}

// =============================================================================
// Sentry APM Integration Stub (OBS-001)
// =============================================================================

/**
 * Sentry configuration options
 */
export interface SentryConfig {
  dsn?: string;
  environment?: string;
  release?: string;
  sampleRate?: number;
}

/**
 * Sentry instance state
 */
interface SentryInstance {
  initialized: boolean;
  dsn?: string;
}

/**
 * Current Sentry instance (singleton)
 */
let sentryInstance: SentryInstance = {
  initialized: false,
};

/**
 * Initialize Sentry APM
 *
 * Call this at application startup to enable error tracking.
 * If DSN is not provided, errors are logged but not sent to Sentry.
 *
 * @param config - Sentry configuration
 *
 * @example
 * // Enable Sentry with DSN
 * configureSentry({
 *   dsn: 'https://abc@sentry.io/123',
 *   environment: 'production',
 *   release: '1.0.0',
 * });
 *
 * @example
 * // Disable Sentry (errors logged only)
 * configureSentry({});
 */
export function configureSentry(config: SentryConfig = {}): void {
  if (!config.dsn) {
    // No DSN provided - disable Sentry, use logging only
    sentryInstance = { initialized: false };
    const logger = getCollectorLogger();
    logger.info('Sentry disabled - no DSN provided');
    return;
  }

  // TODO: Actually initialize Sentry client
  // This is a stub - real implementation would:
  // import * as Sentry from '@sentry/node';
  // Sentry.init({ dsn: config.dsn, environment: config.environment, ... });
  //
  // For now, we just log that Sentry would be initialized
  sentryInstance = {
    initialized: true,
    dsn: config.dsn,
  };

  const logger = getCollectorLogger();
  logger.info('Sentry APM configured', {
    dsn: config.dsn ? '[REDACTED]' : undefined,
    environment: config.environment || 'unknown',
    release: config.release || 'unknown',
  });
}

/**
 * Check if Sentry is initialized
 */
export function isSentryInitialized(): boolean {
  return sentryInstance.initialized;
}

/**
 * Report an exception to Sentry
 *
 * @param error - The error to report
 * @param context - Additional context
 *
 * @example
 * try {
 *   await doSomething();
 * } catch (error) {
 *   captureException(error, { userId: '123', action: 'doSomething' });
 * }
 */
export function captureException(error: unknown, context?: Record<string, unknown>): void {
  const logger = getCollectorLogger();

  if (sentryInstance.initialized) {
    // TODO: Actually send to Sentry
    // Sentry.captureException(error, { extra: context });
    logger.info('[Sentry] Would capture exception', {
      error: error instanceof Error ? error.message : String(error),
      context,
    });
  } else {
    // Sentry not configured - log only
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.warn('[Sentry] Exception captured (Sentry disabled)', {
      error: errorMessage,
      context,
    });
  }
}

/**
 * Add a breadcrumb to Sentry
 *
 * Breadcrumbs are events that happened before an error,
 * useful for debugging.
 *
 * @param _message - Breadcrumb message
 * @param _category - Breadcrumb category (e.g., 'http', 'console', 'navigation')
 * @param _data - Additional data
 *
 * @example
 * addBreadcrumb('User clicked button', 'ui', { buttonId: 'submit-form' });
 */
export function addBreadcrumb(
  _message: string,
  _category: string = 'manual',
  _data?: Record<string, unknown>
): void {
  if (sentryInstance.initialized) {
    // TODO: Actually add breadcrumb
    // Sentry.addBreadcrumb({ message, category, data });
  }
  // No-op if Sentry not initialized - breadcrumbs are internal to Sentry
}

/**
 * Set user context for Sentry
 *
 * This helps track which users are affected by errors.
 *
 * @param _user - User information
 *
 * @example
 * setUserContext({ id: '123', email: 'user@example.com' });
 */
export function setUserContext(_user: { id: string; email?: string }): void {
  if (sentryInstance.initialized) {
    // TODO: Actually set user
    // Sentry.setUser({ id: user.id, email: user.email });
  }
}

/**
 * Set extra context for the current scope
 *
 * @param _key - Context key
 * @param _value - Context value
 *
 * @example
 * setContext('job', { jobId: '123', type: 'collection' });
 */
export function setContext(_key: string, _value: Record<string, unknown>): void {
  if (sentryInstance.initialized) {
    // TODO: Actually set context
    // Sentry.setExtra(key, value);
  }
}

/**
 * Create a span for tracing
 *
 * Use for timing operations and distributed tracing.
 *
 * @param _name - Span name
 * @param _operation - Span operation type
 * @param _context - Additional context
 * @returns Span object (or null if not initialized)
 *
 * @example
 * const span = startSpan('db.query', 'db', { query: 'SELECT * FROM users' });
 * await doQuery();
 * span?.end();
 */
export function startSpan(
  _name: string,
  _operation: string,
  _context?: Record<string, unknown>
): { end: (status?: string) => void } | null {
  if (sentryInstance.initialized) {
    // TODO: Actually create span
    // const span = Sentry.startTransaction({ name, op: operation });
    // return { end: (status) => span.setStatus(status).finish() };
  }

  // Fallback: return a no-op span
  return { end: () => {} };
}

/**
 * Report a message to Sentry
 *
 * @param message - Message to report
 * @param level - Message level (info, warning, error)
 * @param context - Additional context
 *
 * @example
 * captureMessage('High memory usage detected', 'warning', { memory: '85%' });
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, unknown>
): void {
  const logger = getCollectorLogger();

  if (sentryInstance.initialized) {
    // TODO: Actually send to Sentry
    // Sentry.captureMessage(message, level);
    logger.info(`[Sentry] Would capture message (${level})`, { message, context });
  } else {
    // Sentry not configured - log at appropriate level
    if (level === 'error') {
      logger.error(message, new Error(message), context);
    } else if (level === 'warning') {
      logger.warn(message, context);
    } else {
      logger.info(message, context);
    }
  }
}
