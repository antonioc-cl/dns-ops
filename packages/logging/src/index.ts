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

export {
  addMetadata,
  generateRequestId,
  getActorId,
  getContext,
  getDurationMs,
  getLogger,
  getRequestId,
  getTenantId,
  type RequestLogContext,
  runWithContext,
  toLogContext,
} from './context.js';
export {
  CompositeErrorReporter,
  ConsoleErrorReporter,
  type CreateErrorReporterOptions,
  createErrorReporter,
  type ErrorReporter,
  HttpErrorReporter,
} from './error-reporting.js';
export {
  createLogger,
  type LogContext,
  type LogEntry,
  Logger,
  type LoggerConfig,
  type LogLevel,
} from './logger.js';
export {
  type AlertMetrics,
  createFeedbackLoopMetrics,
  createMetricsCollector,
  type FeedbackLoopMetrics,
  type JobMetrics,
  type MetricEvent,
  MetricsCollector,
  type MetricType,
  type RemediationMetrics,
  type ShadowMetrics,
} from './metrics.js';
export { createLoggingMiddleware, type LoggingMiddlewareOptions } from './middleware.js';
