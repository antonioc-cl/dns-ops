/**
 * Logging Context - Bead 14.1
 *
 * Provides request-scoped logging context using AsyncLocalStorage.
 * This allows child loggers to automatically inherit context from parent requests.
 */
import type { LogContext, Logger } from './logger.js';
/**
 * Context stored for each request
 */
export interface RequestLogContext {
    logger: Logger;
    requestId: string;
    tenantId?: string;
    actorId?: string;
    startTime: number;
    metadata: Record<string, unknown>;
}
/**
 * Generate a unique request ID
 */
export declare function generateRequestId(): string;
/**
 * Run a function within a logging context
 */
export declare function runWithContext<T>(context: RequestLogContext, fn: () => T): T;
/**
 * Get the current logging context
 */
export declare function getContext(): RequestLogContext | undefined;
/**
 * Get the current logger from context
 */
export declare function getLogger(): Logger | undefined;
/**
 * Get the current request ID from context
 */
export declare function getRequestId(): string | undefined;
/**
 * Get the current tenant ID from context
 */
export declare function getTenantId(): string | undefined;
/**
 * Get the current actor ID from context
 */
export declare function getActorId(): string | undefined;
/**
 * Add metadata to the current request context
 */
export declare function addMetadata(key: string, value: unknown): void;
/**
 * Create log context from request context
 */
export declare function toLogContext(ctx: RequestLogContext | undefined): LogContext;
/**
 * Calculate request duration from context
 */
export declare function getDurationMs(ctx: RequestLogContext | undefined): number;
//# sourceMappingURL=context.d.ts.map