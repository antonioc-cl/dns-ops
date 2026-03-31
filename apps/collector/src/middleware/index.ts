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
  type ErrorContext,
  type ErrorTrackingConfig,
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
} from './error-tracking.js';
export {
  createErrorResponse,
  type ErrorResponse,
  errorToStatusCode,
  handleResult,
  handleResultWithStatus,
  isDbError,
  isRuleError,
  resultAwareHandler,
  type SuccessResponse,
} from './result-handler.js';
