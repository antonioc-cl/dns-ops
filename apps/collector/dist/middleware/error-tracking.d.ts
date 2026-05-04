/**
 * Error Tracking Middleware - Bead 14.3
 *
 * Captures job, route, probe, and collection failures in the collector runtime.
 * Provides structured logging with context for debugging and monitoring.
 */
import { type Logger } from '@dns-ops/logging';
import type { ErrorHandler, NotFoundHandler } from 'hono';
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
 * Configuration for error tracking.
 *
 * `onError` is the supported extension point for forwarding errors to
 * external reporting services (e.g. Sentry, Datadog, PagerDuty).
 *
 * - In `createErrorTrackingMiddleware`: awaited before the original error is
 *   rethrown. Hook failures are logged as warnings; the original error still
 *   propagates to the global error handler.
 * - In `createErrorHandler`: invoked asynchronously (fire-and-forget) for 5xx
 *   errors only. The JSON response is returned immediately without waiting for
 *   the hook.
 */
export interface ErrorTrackingConfig {
    service?: string;
    version?: string;
    /** Hook for forwarding errors to external reporting services. */
    onError?: (error: Error, context: ErrorContext) => void | Promise<void>;
    skipPaths?: string[];
}
/**
 * Get the collector service logger
 */
export declare function getCollectorLogger(): Logger;
/**
 * Create request logging middleware
 */
export declare function createRequestLoggingMiddleware(config?: ErrorTrackingConfig): import("hono").MiddlewareHandler;
/**
 * Error tracking middleware for routes
 */
export declare function createErrorTrackingMiddleware(config?: ErrorTrackingConfig): import("hono").MiddlewareHandler<Env, any, {}>;
/**
 * Global error handler for Hono
 */
export declare function createErrorHandler(config?: ErrorTrackingConfig): ErrorHandler<Env>;
/**
 * Not found handler
 */
export declare function createNotFoundHandler(): NotFoundHandler<Env>;
/**
 * Track a job error
 */
export declare function trackJobError(error: Error, context: {
    jobId: string;
    jobType: string;
    domain?: string;
    [key: string]: unknown;
}): void;
/**
 * Track a job start
 */
export declare function trackJobStart(context: {
    jobId: string;
    jobType: string;
    domain?: string;
    [key: string]: unknown;
}): void;
/**
 * Track a job completion
 */
export declare function trackJobComplete(context: {
    jobId: string;
    jobType: string;
    domain?: string;
    durationMs: number;
    result?: string;
    [key: string]: unknown;
}): void;
/**
 * Track a probe error
 */
export declare function trackProbeError(error: Error, context: {
    probeType: string;
    hostname: string;
    port?: number;
    [key: string]: unknown;
}): void;
/**
 * Track a probe result
 */
export declare function trackProbeResult(context: {
    probeType: string;
    hostname: string;
    port?: number;
    success: boolean;
    responseTimeMs: number;
    [key: string]: unknown;
}): void;
/**
 * Track a collection error
 */
export declare function trackCollectionError(error: Error, context: {
    domain: string;
    snapshotId?: string;
    [key: string]: unknown;
}): void;
/**
 * Track a collection result
 */
export declare function trackCollectionResult(context: {
    domain: string;
    snapshotId: string;
    recordCount: number;
    durationMs: number;
    resultState: string;
    [key: string]: unknown;
}): void;
/**
 * Track a generic error
 */
export declare function trackError(error: Error, context?: Partial<ErrorContext>): void;
/**
 * Track a warning
 */
export declare function trackWarning(message: string, context?: Record<string, unknown>): void;
/**
 * Track an info event
 */
export declare function trackInfo(message: string, context?: Record<string, unknown>): void;
//# sourceMappingURL=error-tracking.d.ts.map