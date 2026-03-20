/**
 * Structured Logger - Bead 14.1
 *
 * Provides consistent structured logging across web and collector apps.
 * Supports request/tenant/actor context injection.
 */
const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
/**
 * Structured logger with context support
 */
export class Logger {
    config;
    context;
    constructor(config, context = {}) {
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
    child(context) {
        return new Logger(this.config, { ...this.context, ...context });
    }
    /**
     * Create a child logger for a specific request
     */
    forRequest(requestContext) {
        return this.child(requestContext);
    }
    /**
     * Log at debug level
     */
    debug(message, context) {
        this.log('debug', message, context);
    }
    /**
     * Log at info level
     */
    info(message, context) {
        this.log('info', message, context);
    }
    /**
     * Log at warn level
     */
    warn(message, context) {
        this.log('warn', message, context);
    }
    /**
     * Log at error level
     */
    error(message, error, context) {
        const errorDetails = this.extractError(error);
        this.log('error', message, context, errorDetails);
    }
    /**
     * Log request start
     */
    requestStart(method, path) {
        this.info('Request started', { method, path });
    }
    /**
     * Log request completion
     */
    requestEnd(statusCode, durationMs) {
        const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
        this.log(level, 'Request completed', { statusCode, durationMs });
    }
    log(level, message, additionalContext, error) {
        if (LOG_LEVELS[level] < LOG_LEVELS[this.config.minLevel]) {
            return;
        }
        const entry = {
            level,
            message,
            timestamp: new Date().toISOString(),
            context: { ...this.context, ...additionalContext },
            ...(error && { error }),
        };
        if (this.config.output) {
            this.config.output(entry);
        }
        else {
            this.defaultOutput(entry);
        }
    }
    defaultOutput(entry) {
        if (this.config.pretty) {
            this.prettyPrint(entry);
        }
        else {
            this.jsonPrint(entry);
        }
    }
    jsonPrint(entry) {
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
    prettyPrint(entry) {
        const levelColors = {
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
    extractError(error) {
        if (!error)
            return undefined;
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
export function createLogger(config) {
    const isDev = process.env.NODE_ENV === 'development';
    return new Logger({
        minLevel: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
        pretty: isDev,
        ...config,
    });
}
//# sourceMappingURL=logger.js.map