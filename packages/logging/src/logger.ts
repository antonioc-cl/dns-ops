/**
 * Structured Logger - Bead 14.1
 *
 * Provides consistent structured logging across web and collector apps.
 * Supports request/tenant/actor context injection.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Context that gets attached to every log entry
 */
export interface LogContext {
  // Request context
  requestId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  durationMs?: number;

  // Identity context
  tenantId?: string;
  actorId?: string;

  // Service context
  service?: string;
  version?: string;

  // Custom context
  [key: string]: unknown;
}

/**
 * A single log entry
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  /** Minimum log level to emit */
  minLevel: LogLevel;
  /** Service name to include in logs */
  service: string;
  /** Service version */
  version?: string;
  /** Pretty print for development */
  pretty?: boolean;
  /** Custom output handler (defaults to console) */
  output?: (entry: LogEntry) => void;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Structured logger with context support
 */
export class Logger {
  private config: LoggerConfig;
  private context: LogContext;

  constructor(config: LoggerConfig, context: LogContext = {}) {
    this.config = config;
    this.context = {
      service: config.service,
      version: config.version,
      ...context,
    };
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    return new Logger(this.config, { ...this.context, ...context });
  }

  /**
   * Create a child logger for a specific request
   */
  forRequest(requestContext: {
    requestId: string;
    method: string;
    path: string;
    tenantId?: string;
    actorId?: string;
  }): Logger {
    return this.child(requestContext);
  }

  /**
   * Log at debug level
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  /**
   * Log at info level
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * Log at warn level
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  /**
   * Log at error level
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorDetails = this.extractError(error);
    this.log('error', message, context, errorDetails);
  }

  /**
   * Log request start
   */
  requestStart(method: string, path: string): void {
    this.info('Request started', { method, path });
  }

  /**
   * Log request completion
   */
  requestEnd(statusCode: number, durationMs: number): void {
    const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    this.log(level, 'Request completed', { statusCode, durationMs });
  }

  private log(
    level: LogLevel,
    message: string,
    additionalContext?: LogContext,
    error?: LogEntry['error']
  ): void {
    if (LOG_LEVELS[level] < LOG_LEVELS[this.config.minLevel]) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: { ...this.context, ...additionalContext },
      ...(error && { error }),
    };

    if (this.config.output) {
      this.config.output(entry);
    } else {
      this.defaultOutput(entry);
    }
  }

  private defaultOutput(entry: LogEntry): void {
    if (this.config.pretty) {
      this.prettyPrint(entry);
    } else {
      this.jsonPrint(entry);
    }
  }

  private jsonPrint(entry: LogEntry): void {
    const output = JSON.stringify(entry);
    switch (entry.level) {
      case 'error':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      default:
        console.log(output);
    }
  }

  private prettyPrint(entry: LogEntry): void {
    const levelColors: Record<LogLevel, string> = {
      debug: '\x1b[90m', // gray
      info: '\x1b[36m', // cyan
      warn: '\x1b[33m', // yellow
      error: '\x1b[31m', // red
    };
    const reset = '\x1b[0m';
    const color = levelColors[entry.level];
    const levelStr = entry.level.toUpperCase().padEnd(5);

    const contextStr = Object.entries(entry.context)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
      .join(' ');

    const output = `${color}${levelStr}${reset} ${entry.timestamp} ${entry.message}${contextStr ? ` | ${contextStr}` : ''}`;

    switch (entry.level) {
      case 'error':
        console.error(output);
        if (entry.error?.stack) {
          console.error(`      ${entry.error.stack}`);
        }
        break;
      case 'warn':
        console.warn(output);
        break;
      default:
        console.log(output);
    }
  }

  private extractError(error: Error | unknown): LogEntry['error'] | undefined {
    if (!error) return undefined;

    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return {
      name: 'Unknown',
      message: String(error),
    };
  }
}

/**
 * Create a logger with default configuration
 */
export function createLogger(config: Partial<LoggerConfig> & { service: string }): Logger {
  const isDev = process.env.NODE_ENV === 'development';

  return new Logger({
    minLevel: (process.env.LOG_LEVEL as LogLevel) || (isDev ? 'debug' : 'info'),
    pretty: isDev,
    ...config,
  });
}
