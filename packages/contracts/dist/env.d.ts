/**
 * Environment Configuration Schema
 *
 * Defines and validates environment variables used across the monorepo.
 * Works in both Node.js and Cloudflare Workers environments.
 */
interface D1Database {
    prepare(query: string): unknown;
}
/**
 * Shared environment variables used by both web and collector
 */
export interface SharedEnv {
    /**
     * PostgreSQL connection string for database access
     * Required for collector; optional for web (uses D1 in production)
     */
    DATABASE_URL?: string;
    /**
     * Shared secret for internal service-to-service authentication
     * Required for secure web → collector communication
     */
    INTERNAL_SECRET?: string;
    /**
     * Current environment (development, production, test)
     */
    NODE_ENV?: 'development' | 'production' | 'test';
}
/**
 * Web app environment variables
 */
export interface WebEnv extends SharedEnv {
    /**
     * URL to the collector service
     * @default "http://localhost:3001"
     */
    COLLECTOR_URL?: string;
    /**
     * Legacy DMARC tool URL (for backward compatibility)
     */
    VITE_DMARC_TOOL_URL?: string;
    /**
     * Legacy DKIM tool URL (for backward compatibility)
     */
    VITE_DKIM_TOOL_URL?: string;
}
/**
 * Cloudflare Pages/Workers bindings
 */
export interface CloudflareBindings {
    /**
     * D1 database binding (available in Cloudflare Workers)
     */
    DB?: D1Database;
}
/**
 * Collector service environment variables
 */
export interface CollectorEnv extends SharedEnv {
    /**
     * Port to listen on
     * @default 3001
     */
    PORT?: string;
    /**
     * Secret for API key validation
     * Used by external services calling the collector
     */
    API_KEY_SECRET?: string;
}
/**
 * Validation error details
 */
export interface EnvValidationError {
    variable: string;
    message: string;
    required: boolean;
}
/**
 * Validation result
 */
export interface EnvValidationResult {
    valid: boolean;
    errors: EnvValidationError[];
    warnings: EnvValidationError[];
}
/**
 * Validate web app environment variables
 */
export declare function validateWebEnv(env: Record<string, string | undefined>): EnvValidationResult;
/**
 * Validate collector environment variables
 */
export declare function validateCollectorEnv(env: Record<string, string | undefined>): EnvValidationResult;
/**
 * Get web environment with defaults
 */
export declare function getWebEnv(env: Record<string, string | undefined>): WebEnv;
/**
 * Get collector environment with defaults
 */
export declare function getCollectorEnv(env: Record<string, string | undefined>): CollectorEnv;
/**
 * Format validation result for logging
 */
export declare function formatValidationResult(result: EnvValidationResult): string;
export {};
//# sourceMappingURL=env.d.ts.map