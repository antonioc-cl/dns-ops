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
  // Types
  type ApiErrorEnvelope,
  createErrorHandler,
  createErrorTrackingMiddleware,
  createNotFoundHandler,
  createRequestLoggingMiddleware,
  ErrorCode,
  type ErrorCodeType,
  type ErrorContext,
  type ErrorTrackingConfig,
  errorResponse,
  getWebLogger,
  // Fail-fast helpers
  requireConfig,
  requireDb,
  // Tracking
  trackError,
  trackInfo,
  trackWarning,
} from './error-tracking.js';
