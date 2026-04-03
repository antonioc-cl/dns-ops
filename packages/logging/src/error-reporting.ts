/**
 * Error Reporter
 *
 * Provides ErrorReporter interface for centralized error reporting.
 * Default implementation: ConsoleErrorReporter (logs to console.error).
 *
 * To integrate an external service (e.g. Sentry), implement the
 * ErrorReporter interface and pass it where needed — or use the
 * `ErrorTrackingConfig.onError` hook in the collector/web middleware.
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
 * Console error reporter — logs errors to stderr via console.error.
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
 * Create the default error reporter (console-backed).
 */
export function createErrorReporter(): ErrorReporter {
  return new ConsoleErrorReporter();
}
