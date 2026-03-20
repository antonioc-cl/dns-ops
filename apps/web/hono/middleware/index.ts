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
  createErrorHandler,
  createErrorTrackingMiddleware,
  createNotFoundHandler,
  createRequestLoggingMiddleware,
  getWebLogger,
  trackError,
  trackInfo,
  trackWarning,
  type ErrorContext,
  type ErrorTrackingConfig,
} from './error-tracking.js';
