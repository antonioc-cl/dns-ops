/**
 * Collector Middleware
 *
 * Shared middleware for the collector service.
 */

export {
  internalOnlyMiddleware,
  requireServiceAuthMiddleware,
  serviceAuthMiddleware,
} from './auth.js';
export { dbMiddleware, dbMiddlewareStrict } from './db.js';
export {
  createErrorHandler,
  createErrorTrackingMiddleware,
  createNotFoundHandler,
  createRequestLoggingMiddleware,
  getCollectorLogger,
  trackCollectionError,
  trackCollectionResult,
  trackError,
  trackInfo,
  trackJobComplete,
  trackJobError,
  trackJobStart,
  trackProbeError,
  trackProbeResult,
  trackWarning,
  type ErrorContext,
  type ErrorTrackingConfig,
} from './error-tracking.js';
