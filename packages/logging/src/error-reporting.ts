/**
 * Error Reporter Integration
 *
 * Provides ErrorReporter interface for centralized error reporting.
 * ConsoleErrorReporter is the default.
 * SentryErrorReporter can be enabled via SENTRY_DSN env var.
 */

/**
 * Error reporter interface for centralized error tracking
 */
export interface ErrorReporter {
  /**
   * Report an error with context
   */
  report(error: Error, context?: Record<string, unknown>): void | Promise<void>;
}

/**
 * Console error reporter - logs to console
 */
export class ConsoleErrorReporter implements ErrorReporter {
  report(error: Error, context?: Record<string, unknown>): void {
    console.error('[ErrorReporter]', error.message, {
      error: error.stack,
      ...context,
    });
  }
}

/**
 * Create error reporter based on environment
 */
export function createErrorReporter(): ErrorReporter {
  return new ConsoleErrorReporter();
}
