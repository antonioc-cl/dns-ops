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
export declare function errorToStatusCode(error: unknown): StatusCode;
/**
 * Create a standardized error response
 */
export declare function createErrorResponse(error: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
}): ErrorResponse;
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
export declare function handleResult<T>(c: Context, result: {
    isOk(): boolean;
    isErr(): boolean;
    value?: T;
    error?: DbError | RuleError | SimulationError | Error;
}): Response;
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
export declare function handleResultWithStatus<T>(c: Context, result: {
    isOk(): boolean;
    isErr(): boolean;
    value?: T;
    error?: DbError | RuleError | SimulationError | Error;
}, successStatus: StatusCode): Response;
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
export declare function resultAwareHandler<T>(handler: (c: Context) => Promise<{
    isOk(): boolean;
    isErr(): boolean;
    value?: T;
    error?: DbError | RuleError | SimulationError | Error;
}>, successStatus?: StatusCode): (c: Context) => Promise<Response>;
/**
 * Type guard for DbError
 * Checks for DbError-specific properties
 */
export declare function isDbError(error: Error): error is DbError;
/**
 * Type guard for RuleError
 * Checks for RuleError-specific properties
 */
export declare function isRuleError(error: Error): error is RuleError;
/**
 * Type guard for SimulationError
 * Checks for SimulationError-specific properties
 */
export declare function isSimulationError(error: Error): error is SimulationError;
//# sourceMappingURL=result-handler.d.ts.map