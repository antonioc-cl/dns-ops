/**
 * Error Tracking Middleware - Bead 14.3
 *
 * Captures job, route, probe, and collection failures in the collector runtime.
 * Provides structured logging with context for debugging and monitoring.
 */
import { createErrorReporter, createLogger, createLoggingMiddleware, } from '@dns-ops/logging';
import { createMiddleware } from 'hono/factory';
// Singleton logger for the collector service
let collectorLogger;
/**
 * Get the collector service logger
 */
export function getCollectorLogger() {
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
export function createRequestLoggingMiddleware(config = {}) {
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
export function createErrorTrackingMiddleware(config = {}) {
    const logger = getCollectorLogger();
    // Lazily created per-instance; reads ERROR_REPORTING_ENDPOINT at first error
    let defaultReporter;
    const getReporter = () => (defaultReporter ??= createErrorReporter());
    return createMiddleware(async (c, next) => {
        const requestId = c.req.header('X-Request-Id') ||
            `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
        const startTime = Date.now();
        try {
            await next();
        }
        catch (error) {
            const durationMs = Date.now() - startTime;
            const context = {
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
                    }
                    catch (hookError) {
                        logger.warn('Error in onError hook', {
                            hookError: hookError instanceof Error ? hookError.message : String(hookError),
                        });
                    }
                }
                else {
                    // Default: forward to centralised error reporter
                    try {
                        await getReporter().report(error, { ...context, durationMs });
                    }
                    catch {
                        // reporter failures are non-fatal
                    }
                }
            }
            else {
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
export function createErrorHandler(config = {}) {
    const logger = getCollectorLogger();
    // Lazily created per-instance; reads ERROR_REPORTING_ENDPOINT at first error
    let defaultReporter;
    const getReporter = () => (defaultReporter ??= createErrorReporter());
    return (error, c) => {
        const requestId = c.req.header('X-Request-Id') || 'unknown';
        const statusCode = 'status' in error && typeof error.status === 'number' ? error.status : 500;
        const context = {
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
            else {
                // Default: forward to centralised error reporter (fire-and-forget)
                void getReporter().report(error, context);
            }
        }
        else {
            logger.info(`Client error: ${error.message}`, context);
        }
        return c.json({
            error: statusCode >= 500 ? 'Internal Server Error' : error.message,
            requestId,
            ...(process.env.NODE_ENV === 'development' && statusCode >= 500
                ? { stack: error.stack }
                : {}),
        }, statusCode);
    };
}
/**
 * Not found handler
 */
export function createNotFoundHandler() {
    const logger = getCollectorLogger();
    return (c) => {
        const requestId = c.req.header('X-Request-Id') || 'unknown';
        logger.info('Not found', {
            requestId,
            method: c.req.method,
            path: c.req.path,
        });
        return c.json({
            error: 'Not Found',
            path: c.req.path,
            requestId,
        }, 404);
    };
}
/**
 * Track a job error
 */
export function trackJobError(error, context) {
    const logger = getCollectorLogger();
    logger.error(`Job failed: ${error.message}`, error, {
        ...context,
        errorType: 'job_failure',
    });
}
/**
 * Track a job start
 */
export function trackJobStart(context) {
    const logger = getCollectorLogger();
    logger.info('Job started', {
        ...context,
        eventType: 'job_start',
    });
}
/**
 * Track a job completion
 */
export function trackJobComplete(context) {
    const logger = getCollectorLogger();
    logger.info('Job completed', {
        ...context,
        eventType: 'job_complete',
    });
}
/**
 * Track a probe error
 */
export function trackProbeError(error, context) {
    const logger = getCollectorLogger();
    logger.error(`Probe failed: ${error.message}`, error, {
        ...context,
        errorType: 'probe_failure',
    });
}
/**
 * Track a probe result
 */
export function trackProbeResult(context) {
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
export function trackCollectionError(error, context) {
    const logger = getCollectorLogger();
    logger.error(`Collection failed: ${error.message}`, error, {
        ...context,
        errorType: 'collection_failure',
    });
}
/**
 * Track a collection result
 */
export function trackCollectionResult(context) {
    const logger = getCollectorLogger();
    logger.info('Collection completed', {
        ...context,
        eventType: 'collection_result',
    });
}
/**
 * Track a generic error
 */
export function trackError(error, context) {
    const logger = getCollectorLogger();
    logger.error(`Tracked error: ${error.message}`, error, context || {});
}
/**
 * Track a warning
 */
export function trackWarning(message, context) {
    const logger = getCollectorLogger();
    logger.warn(message, context || {});
}
/**
 * Track an info event
 */
export function trackInfo(message, context) {
    const logger = getCollectorLogger();
    logger.info(message, context || {});
}
//# sourceMappingURL=error-tracking.js.map