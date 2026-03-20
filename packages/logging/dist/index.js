/**
 * DNS Ops Workbench - Structured Logging Package
 *
 * Provides consistent structured logging across web and collector apps
 * with request/tenant/actor context injection.
 *
 * @example
 * ```typescript
 * import { createLogger } from '@dns-ops/logging';
 *
 * const logger = createLogger({ service: 'collector' });
 *
 * // Basic logging
 * logger.info('Starting collection', { domain: 'example.com' });
 * logger.error('Collection failed', error, { domain: 'example.com' });
 *
 * // Child logger with context
 * const requestLogger = logger.child({ requestId: 'abc123', tenantId: 'tenant-1' });
 * requestLogger.info('Processing request');
 * ```
 *
 * @example
 * ```typescript
 * // With Hono middleware
 * import { createLogger, createLoggingMiddleware } from '@dns-ops/logging';
 *
 * const logger = createLogger({ service: 'web' });
 * app.use('*', createLoggingMiddleware({ logger }));
 *
 * // In route handlers, logger is available on context
 * app.get('/api/domains', (c) => {
 *   const logger = c.get('logger');
 *   logger.info('Fetching domains');
 * });
 * ```
 */
export { createLogger, Logger } from './logger.js';
export { addMetadata, generateRequestId, getActorId, getContext, getDurationMs, getLogger, getRequestId, getTenantId, runWithContext, toLogContext, } from './context.js';
export { createLoggingMiddleware } from './middleware.js';
//# sourceMappingURL=index.js.map