/**
 * Web Hono Middleware
 *
 * Shared middleware for the web API.
 */

export {
  authMiddleware,
  internalOnlyMiddleware,
  requireAuthMiddleware,
} from './auth.js';
export {
  enforceTenantIsolation,
  requireAdminAccess,
  requireAuth,
  requireWritePermission,
} from './authorization.js';
export { dbMiddleware } from './db.js';
export {
  // Error handling
  ApiError,
  createErrorHandler,
  createErrorTrackingMiddleware,
  createNotFoundHandler,
  createRequestLoggingMiddleware,
  ErrorCode,
  errorResponse,
  getWebLogger,
  // Fail-fast helpers
  requireConfig,
  requireDb,
  // Tracking
  trackError,
  trackInfo,
  trackWarning,
  // Types
  type ApiErrorEnvelope,
  type ErrorCodeType,
  type ErrorContext,
  type ErrorTrackingConfig,
} from './error-tracking.js';
