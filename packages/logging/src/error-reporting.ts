/**
 * Error Reporter
 *
 * Provides ErrorReporter interface for centralized error reporting.
 * Default: ConsoleErrorReporter (logs to console.error).
 *
 * To integrate an external service (e.g. Sentry, Datadog), either:
 * 1. Implement ErrorReporter and pass via createErrorReporter({ custom: ... })
 * 2. Use the ErrorTrackingConfig.onError hook in collector/web middleware
 *
 * The factory checks for ERROR_REPORTING_ENDPOINT env var. When set,
 * errors are also forwarded as JSON POST (fire-and-forget, best-effort).
 */

/**
 * Error reporter interface for centralized error tracking
 */
export interface ErrorReporter {
  /** Report an error with context */
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
 * HTTP error reporter — posts errors to a remote endpoint (fire-and-forget).
 * Falls back to console on delivery failure.
 */
export class HttpErrorReporter implements ErrorReporter {
  private readonly endpoint: string;
  private readonly fallback: ConsoleErrorReporter;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
    this.fallback = new ConsoleErrorReporter();
  }

  async report(error: Error, context?: Record<string, unknown>): Promise<void> {
    // Always log locally
    this.fallback.report(error, context);

    // Best-effort POST to external endpoint
    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          name: error.name,
          context,
          timestamp: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(3000),
      });
    } catch {
      // Fire-and-forget — failure does not propagate
    }
  }
}

/**
 * Composite error reporter — delegates to multiple reporters.
 */
export class CompositeErrorReporter implements ErrorReporter {
  private readonly reporters: ErrorReporter[];

  constructor(reporters: ErrorReporter[]) {
    this.reporters = reporters;
  }

  async report(error: Error, context?: Record<string, unknown>): Promise<void> {
    await Promise.allSettled(this.reporters.map((r) => r.report(error, context)));
  }
}

export interface CreateErrorReporterOptions {
  /** Custom reporter to use instead of/alongside defaults */
  custom?: ErrorReporter;
  /** Skip env-based auto-detection and use console only */
  consoleOnly?: boolean;
}

/**
 * Create an error reporter.
 *
 * Auto-detection order:
 * 1. If `options.custom` provided, uses composite (console + custom)
 * 2. If ERROR_REPORTING_ENDPOINT env is set, uses HTTP reporter (includes console fallback)
 * 3. Otherwise, returns ConsoleErrorReporter
 */
export function createErrorReporter(options?: CreateErrorReporterOptions): ErrorReporter {
  if (options?.consoleOnly) {
    return new ConsoleErrorReporter();
  }

  if (options?.custom) {
    return new CompositeErrorReporter([new ConsoleErrorReporter(), options.custom]);
  }

  // Check env for HTTP endpoint
  const endpoint =
    typeof process !== 'undefined' ? process.env?.ERROR_REPORTING_ENDPOINT : undefined;

  if (endpoint) {
    return new HttpErrorReporter(endpoint);
  }

  return new ConsoleErrorReporter();
}
