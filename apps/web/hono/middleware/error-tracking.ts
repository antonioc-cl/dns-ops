/**
 * Error Tracking Middleware - Bead 14.2
 *
 * Captures route/component/runtime failures with structured logging
 * and optional external error tracking service integration.
 *
 * Bead 1j4.2.7: Standardized error envelopes and fail-fast infrastructure checks.
 */

import type { SimpleDatabaseAdapter } from '@dns-ops/db';
import { createLogger, createLoggingMiddleware, type Logger } from '@dns-ops/logging';
import type { Context, ErrorHandler, NotFoundHandler } from 'hono';
import { createMiddleware } from 'hono/factory';
import type { Env } from '../types.js';

// =============================================================================
// Standardized Error Codes (Bead 1j4.2.7)
// =============================================================================

/**
 * Standard error codes for API responses.
 * Codes are namespaced by category:
 * - INFRA_*: Infrastructure/runtime failures
 * - AUTH_*: Authentication/authorization failures
 * - VALIDATION_*: Input validation failures
 * - RESOURCE_*: Resource state failures
 * - EXTERNAL_*: External service failures
 */
export const ErrorCode = {
  // Infrastructure errors (503)
  INFRA_DB_UNAVAILABLE: 'INFRA_DB_UNAVAILABLE',
  INFRA_CACHE_UNAVAILABLE: 'INFRA_CACHE_UNAVAILABLE',
  INFRA_CONFIG_MISSING: 'INFRA_CONFIG_MISSING',

  // Authentication errors (401)
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
  AUTH_EXPIRED: 'AUTH_EXPIRED',

  // Authorization errors (403)
  AUTHZ_FORBIDDEN: 'AUTHZ_FORBIDDEN',
  AUTHZ_INSUFFICIENT_PERMISSIONS: 'AUTHZ_INSUFFICIENT_PERMISSIONS',

  // Validation errors (400)
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  VALIDATION_MISSING_FIELD: 'VALIDATION_MISSING_FIELD',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',

  // Resource errors (404, 409)
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  RESOURCE_GONE: 'RESOURCE_GONE',

  // External service errors (502, 503)
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  EXTERNAL_TIMEOUT: 'EXTERNAL_TIMEOUT',
  EXTERNAL_UNAVAILABLE: 'EXTERNAL_UNAVAILABLE',

  // Internal errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  INTERNAL_UNEXPECTED: 'INTERNAL_UNEXPECTED',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

// =============================================================================
// Standardized Error Envelope (Bead 1j4.2.7)
// =============================================================================

/**
 * Standard API error response envelope.
 * All error responses should follow this structure for consistency.
 */
export interface ApiErrorEnvelope {
  /** Always false for error responses */
  ok: false;
  /** Machine-readable error code */
  code: ErrorCodeType | string;
  /** Human-readable error message */
  error: string;
  /** Request ID for debugging/support */
  requestId: string;
  /** Optional additional details (validation errors, etc.) */
  details?: Record<string, unknown>;
  /** Stack trace (development only) */
  stack?: string;
}

/**
 * Custom error class for API errors.
 * Throw this to return a standardized error response.
 */
export class ApiError extends Error {
  readonly code: ErrorCodeType | string;
  readonly statusCode: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCodeType | string,
    message: string,
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  /**
   * Create a 400 Bad Request error
   */
  static badRequest(message: string, details?: Record<string, unknown>): ApiError {
    return new ApiError(ErrorCode.VALIDATION_FAILED, message, 400, details);
  }

  /**
   * Create a 401 Unauthorized error
   */
  static unauthorized(message: string = 'Authentication required'): ApiError {
    return new ApiError(ErrorCode.AUTH_REQUIRED, message, 401);
  }

  /**
   * Create a 403 Forbidden error
   */
  static forbidden(message: string = 'Access denied'): ApiError {
    return new ApiError(ErrorCode.AUTHZ_FORBIDDEN, message, 403);
  }

  /**
   * Create a 404 Not Found error
   */
  static notFound(resource: string): ApiError {
    return new ApiError(ErrorCode.RESOURCE_NOT_FOUND, `${resource} not found`, 404);
  }

  /**
   * Create a 503 Service Unavailable error for infrastructure
   */
  static infraUnavailable(
    component: string,
    code: ErrorCodeType = ErrorCode.INFRA_DB_UNAVAILABLE
  ): ApiError {
    return new ApiError(code, `${component} is not available`, 503);
  }

  /**
   * Create a 503 error for external service failures
   */
  static externalServiceError(service: string, originalError?: Error): ApiError {
    return new ApiError(
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      `Failed to connect to ${service}`,
      503,
      originalError ? { originalMessage: originalError.message } : undefined
    );
  }
}

// =============================================================================
// Fail-Fast Infrastructure Helpers (Bead 1j4.2.7)
// =============================================================================

/**
 * Require database adapter or fail fast with 503.
 * Use this at the start of routes that need database access.
 *
 * @example
 * ```ts
 * const db = requireDb(c);
 * // db is guaranteed to be non-null here
 * ```
 */
export function requireDb(c: Context<Env>): SimpleDatabaseAdapter {
  const db = c.get('db');
  if (!db) {
    throw ApiError.infraUnavailable('Database', ErrorCode.INFRA_DB_UNAVAILABLE);
  }
  return db;
}

/**
 * Require a configuration value or fail fast with 503.
 *
 * @example
 * ```ts
 * const collectorUrl = requireConfig('COLLECTOR_URL', process.env.COLLECTOR_URL);
 * ```
 */
export function requireConfig(name: string, value: string | undefined): string {
  if (!value) {
    throw new ApiError(
      ErrorCode.INFRA_CONFIG_MISSING,
      `Required configuration '${name}' is not set`,
      503
    );
  }
  return value;
}

/**
 * Build a standardized error response.
 * Use this helper for consistent error formatting.
 */
export function errorResponse(
  c: Context<Env>,
  code: ErrorCodeType | string,
  message: string,
  statusCode: number,
  details?: Record<string, unknown>
): Response {
  // Generate a request ID from header or timestamp
  const requestId = c.req.header('X-Request-ID') || `req_${Date.now().toString(36)}`;

  const envelope: ApiErrorEnvelope = {
    ok: false,
    code,
    error: message,
    requestId,
    ...(details && { details }),
  };

  // Log infrastructure and internal errors
  if (statusCode >= 500) {
    const logger = getWebLogger();
    logger.error(`API Error [${code}]: ${message}`, undefined, {
      requestId,
      statusCode,
      path: c.req.path,
      method: c.req.method,
      ...details,
    });
  }

  return c.json(envelope, statusCode as 500);
}

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
 * Error context passed to error handlers.
 * Compatible with LogContext via index signature.
 */
export interface ErrorContext {
  requestId: string;
  method: string;
  path: string;
  tenantId?: string;
  actorId?: string;
  statusCode?: number;
  userAgent?: string;
  /** Index signature for LogContext compatibility */
  [key: string]: unknown;
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
 * Returns consistent JSON error responses using standardized envelope.
 */
export function createErrorHandler(config: ErrorTrackingConfig = {}): ErrorHandler<Env> {
  const logger = getWebLogger();
  const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';

  return (error, c) => {
    const requestId = c.get('requestId') || 'unknown';

    // Handle ApiError with its specific code and status
    if (error instanceof ApiError) {
      const context: ErrorContext = {
        requestId,
        method: c.req.method,
        path: c.req.path,
        tenantId: c.get('tenantId'),
        actorId: c.get('actorId'),
        statusCode: error.statusCode,
      };

      // Log 5xx errors at error level
      if (error.statusCode >= 500) {
        logger.error(`API Error [${error.code}]: ${error.message}`, error, context);

        if (config.onError) {
          Promise.resolve(config.onError(error, context)).catch((hookError) => {
            logger.warn('Error in onError hook', {
              hookError: hookError instanceof Error ? hookError.message : String(hookError),
            });
          });
        }
      } else {
        logger.info(`Client error [${error.code}]: ${error.message}`, context);
      }

      const envelope: ApiErrorEnvelope = {
        ok: false,
        code: error.code,
        error: error.message,
        requestId,
        ...(error.details && { details: error.details }),
        ...(isDev && error.statusCode >= 500 && { stack: error.stack }),
      };

      return c.json(envelope, error.statusCode as 500);
    }

    // Handle standard errors
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

    // Use standardized envelope for all errors
    const envelope: ApiErrorEnvelope = {
      ok: false,
      code: statusCode >= 500 ? ErrorCode.INTERNAL_ERROR : ErrorCode.VALIDATION_FAILED,
      error: statusCode >= 500 ? 'Internal Server Error' : error.message,
      requestId,
      ...(isDev && statusCode >= 500 && { stack: error.stack }),
    };

    return c.json(envelope, statusCode as 500);
  };
}

/**
 * Not found handler for Hono
 * Returns standardized 404 error envelope.
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

    const envelope: ApiErrorEnvelope = {
      ok: false,
      code: ErrorCode.RESOURCE_NOT_FOUND,
      error: 'Not Found',
      requestId,
      details: { path: c.req.path },
    };

    return c.json(envelope, 404);
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

// =============================================================================
// Product Event Tracking (Bead 14.4)
// =============================================================================

/**
 * Track a portfolio search event
 */
export function trackSearch(context: {
  tenantId: string;
  query?: string;
  filters?: Record<string, unknown>;
  resultCount: number;
  durationMs: number;
}): void {
  const logger = getWebLogger();
  logger.info('Product event: search', {
    eventType: 'product_search',
    ...context,
  });
}

/**
 * Track a domain refresh (re-collect) event
 */
export function trackRefresh(context: {
  tenantId: string;
  domain: string;
  snapshotId?: string;
  triggeredBy: string;
  success: boolean;
  durationMs?: number;
}): void {
  const logger = getWebLogger();
  logger.info('Product event: refresh', {
    eventType: 'product_refresh',
    ...context,
  });
}

/**
 * Track a mail check event
 */
export function trackMailCheck(context: {
  tenantId: string;
  domain: string;
  checkType: 'dkim' | 'spf' | 'dmarc' | 'mta-sts' | 'all';
  success: boolean;
  issues?: number;
  durationMs?: number;
}): void {
  const logger = getWebLogger();
  logger.info('Product event: mail_check', {
    eventType: 'product_mail_check',
    ...context,
  });
}

/**
 * Track a diff/comparison view event
 */
export function trackDiff(context: {
  tenantId: string;
  domain?: string;
  snapshotIds: [string, string];
  changeCount: number;
  diffType: 'records' | 'findings' | 'scope' | 'ruleset' | 'full';
}): void {
  const logger = getWebLogger();
  logger.info('Product event: diff', {
    eventType: 'product_diff',
    ...context,
  });
}

/**
 * Track a remediation action event
 */
export function trackRemediation(context: {
  tenantId: string;
  domain: string;
  findingId: string;
  remediationType: 'auto' | 'manual' | 'template';
  status: 'started' | 'completed' | 'failed';
  provider?: string;
}): void {
  const logger = getWebLogger();
  logger.info('Product event: remediation', {
    eventType: 'product_remediation',
    ...context,
  });
}

/**
 * Track a legacy tool open event
 */
export function trackLegacyOpen(context: {
  tenantId: string;
  toolType: string;
  domain?: string;
  parameters?: Record<string, unknown>;
}): void {
  const logger = getWebLogger();
  logger.info('Product event: legacy_open', {
    eventType: 'product_legacy_open',
    ...context,
  });
}

/**
 * Track a report generation/view event
 */
export function trackReport(context: {
  tenantId: string;
  reportType: 'fleet' | 'domain' | 'finding' | 'monitoring' | 'shared';
  reportId?: string;
  action: 'generate' | 'view' | 'export' | 'share';
  format?: string;
}): void {
  const logger = getWebLogger();
  logger.info('Product event: report', {
    eventType: 'product_report',
    ...context,
  });
}

/**
 * Track an alert event
 */
export function trackAlert(context: {
  tenantId: string;
  alertId: string;
  alertType: string;
  action: 'view' | 'acknowledge' | 'resolve' | 'dismiss';
  severity?: string;
}): void {
  const logger = getWebLogger();
  logger.info('Product event: alert', {
    eventType: 'product_alert',
    ...context,
  });
}
