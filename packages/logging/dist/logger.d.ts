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
    requestId?: string;
    method?: string;
    path?: string;
    statusCode?: number;
    durationMs?: number;
    tenantId?: string;
    actorId?: string;
    service?: string;
    version?: string;
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
/**
 * Structured logger with context support
 */
export declare class Logger {
    private config;
    private context;
    constructor(config: LoggerConfig, context?: LogContext);
    /**
     * Create a child logger with additional context
     */
    child(context: LogContext): Logger;
    /**
     * Create a child logger for a specific request
     */
    forRequest(requestContext: {
        requestId: string;
        method: string;
        path: string;
        tenantId?: string;
        actorId?: string;
    }): Logger;
    /**
     * Log at debug level
     */
    debug(message: string, context?: LogContext): void;
    /**
     * Log at info level
     */
    info(message: string, context?: LogContext): void;
    /**
     * Log at warn level
     */
    warn(message: string, context?: LogContext): void;
    /**
     * Log at error level
     */
    error(message: string, error?: Error | unknown, context?: LogContext): void;
    /**
     * Log request start
     */
    requestStart(method: string, path: string): void;
    /**
     * Log request completion
     */
    requestEnd(statusCode: number, durationMs: number): void;
    private log;
    private defaultOutput;
    private jsonPrint;
    private prettyPrint;
    private extractError;
}
/**
 * Create a logger with default configuration
 */
export declare function createLogger(config: Partial<LoggerConfig> & {
    service: string;
}): Logger;
//# sourceMappingURL=logger.d.ts.map