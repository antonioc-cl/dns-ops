/**
 * Result Handler Middleware
 *
 * Provides utilities for handling Result types in Hono routes.
 * Converts Results to standardized JSON responses.
 */

import type { DbError } from '@dns-ops/db';
import type { RuleError, SimulationError } from '@dns-ops/rules';
import type { Context } from 'hono';
import type { StatusCode } from 'hono/utils/http-status';
import { getCollectorLogger } from './error-tracking.js';

const logger = getCollectorLogger();

/**
 * Error code to HTTP status mapping
 */
const ERROR_STATUS_MAP: Record<string, StatusCode> = {
  // DbError codes
  NOT_FOUND: 404,
  ALREADY_EXISTS: 409,
  TENANT_ISOLATION: 403,
  CONSTRAINT_VIOLATION: 400,
  QUERY_FAILED: 500,
  CONNECTION_ERROR: 503,
  TIMEOUT: 504,

  // RuleError codes
  RULE_EXECUTION_FAILED: 500,
  INVALID_CONTEXT: 400,
  RULE_NOT_FOUND: 404,
  RULESET_NOT_FOUND: 404,
  EVALUATION_TIMEOUT: 504,

  // SimulationError codes
  INVALID_FINDING_TYPE: 400,
  NO_ACTIONABLE_FINDINGS: 400,
  SIMULATION_FAILED: 500,

  // ValidationError codes (from contracts)
  VALIDATION_ERROR: 400,

  // ParseError codes (from contracts)
  PARSE_ERROR: 400,
};

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Success response wrapper
 */
export interface SuccessResponse<T> {
  data: T;
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Convert a Result error to HTTP status code
 */
export function errorToStatusCode(error: unknown): StatusCode {
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') {
    return ERROR_STATUS_MAP[error.code] ?? 500;
  }
  return 500;
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(error: {
  code?: string;
  message?: string;
  details?: Record<string, unknown>;
}): ErrorResponse {
  return {
    error: {
      code: error.code ?? 'UNKNOWN_ERROR',
      message: error.message ?? 'An unknown error occurred',
      details: error.details,
    },
  };
}

/**
 * Handle a Result and return appropriate JSON response
 *
 * @example
 * ```typescript
 * app.post('/api/domain', async (c) => {
 *   const result = await createDomain(c.get('db'), data);
 *   return handleResult(c, result);
 * });
 * ```
 */
export function handleResult<T>(
  c: Context,
  result: {
    isOk(): boolean;
    isErr(): boolean;
    value?: T;
    error?: DbError | RuleError | SimulationError | Error;
  }
): Response {
  if (result.isOk()) {
    const response: SuccessResponse<T> = {
      data: result.value as T,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: c.req.header('X-Request-ID'),
      },
    };
    return c.json(response, 200);
  }

  const error = result.error!;
  const statusCode = errorToStatusCode(error);
  const errorResponse = createErrorResponse({
    code: 'code' in error ? error.code : 'UNKNOWN_ERROR',
    message: error.message,
    details: 'details' in error ? (error.details as Record<string, unknown>) : undefined,
  });

  // Log server errors (5xx)
  if (statusCode >= 500) {
    logger.error(
      'Server error in request handler',
      error instanceof Error ? error : new Error(String(error)),
      {
        path: c.req.path,
        method: c.req.method,
        statusCode,
      }
    );
  }

  return c.json(errorResponse, statusCode);
}

/**
 * Handle a Result and return appropriate JSON response with custom success status
 *
 * @example
 * ```typescript
 * app.post('/api/domain', async (c) => {
 *   const result = await createDomain(c.get('db'), data);
 *   return handleResultWithStatus(c, result, 201);
 * });
 * ```
 */
export function handleResultWithStatus<T>(
  c: Context,
  result: {
    isOk(): boolean;
    isErr(): boolean;
    value?: T;
    error?: DbError | RuleError | SimulationError | Error;
  },
  successStatus: StatusCode
): Response {
  if (result.isOk()) {
    const response: SuccessResponse<T> = {
      data: result.value as T,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: c.req.header('X-Request-ID'),
      },
    };
    return c.json(response, successStatus);
  }

  const error = result.error!;
  const statusCode = errorToStatusCode(error);
  const errorResponse = createErrorResponse({
    code: 'code' in error ? error.code : 'UNKNOWN_ERROR',
    message: error.message,
    details: 'details' in error ? (error.details as Record<string, unknown>) : undefined,
  });

  if (statusCode >= 500) {
    logger.error(
      'Server error in request handler',
      error instanceof Error ? error : new Error(String(error)),
      {
        path: c.req.path,
        method: c.req.method,
        statusCode,
      }
    );
  }

  return c.json(errorResponse, statusCode);
}

/**
 * Middleware factory that wraps a handler to automatically handle Results
 *
 * @example
 * ```typescript
 * app.post('/api/domain', resultAwareHandler(async (c) => {
 *   const result = await createDomain(c.get('db'), await c.req.json());
 *   return result; // Returns Result<Domain, DbError>
 * }));
 * ```
 */
export function resultAwareHandler<T>(
  handler: (c: Context) => Promise<{
    isOk(): boolean;
    isErr(): boolean;
    value?: T;
    error?: DbError | RuleError | SimulationError | Error;
  }>,
  successStatus: StatusCode = 200
): (c: Context) => Promise<Response> {
  return async (c: Context) => {
    const result = await handler(c);
    return handleResultWithStatus(c, result, successStatus);
  };
}

/**
 * Type guard for DbError
 * Checks for DbError-specific properties
 */
export function isDbError(error: Error): error is DbError {
  return (
    'code' in error &&
    typeof error.code === 'string' &&
    ('table' in error || 'identifier' in error || 'DbError' === error.name)
  );
}

/**
 * Type guard for RuleError
 * Checks for RuleError-specific properties
 */
export function isRuleError(error: Error): error is RuleError {
  return (
    'code' in error &&
    typeof error.code === 'string' &&
    ('ruleId' in error || 'context' in error || 'RuleError' === error.name)
  );
}

/**
 * Type guard for SimulationError
 * Checks for SimulationError-specific properties
 */
export function isSimulationError(error: Error): error is SimulationError {
  return (
    'code' in error &&
    typeof error.code === 'string' &&
    ('findingType' in error || 'SimulationError' === error.name)
  );
}
