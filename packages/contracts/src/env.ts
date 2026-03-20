/**
 * Environment Configuration Schema
 *
 * Defines and validates environment variables used across the monorepo.
 * Works in both Node.js and Cloudflare Workers environments.
 */

// Type declarations for runtime globals (available in Node.js and Workers)
declare const URL: {
  new (url: string, base?: string): { href: string };
};

// Cloudflare D1 database type (defined when running in Workers)
interface D1Database {
  // Minimal interface - full type provided by @cloudflare/workers-types
  prepare(query: string): unknown;
}

// =============================================================================
// SHARED ENVIRONMENT VARIABLES (both web and collector)
// =============================================================================

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

// =============================================================================
// WEB APP ENVIRONMENT
// =============================================================================

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

// =============================================================================
// COLLECTOR ENVIRONMENT
// =============================================================================

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

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

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
 * Check if a string is a valid URL
 */
function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a string is a valid PostgreSQL connection string
 */
function isValidDatabaseUrl(value: string): boolean {
  // Basic check for postgres:// or postgresql:// prefix
  return /^postgres(ql)?:\/\/.+/.test(value);
}

/**
 * Check if a string is a valid port number
 */
function isValidPort(value: string): boolean {
  const port = parseInt(value, 10);
  return !isNaN(port) && port > 0 && port < 65536;
}

/**
 * Validate web app environment variables
 */
export function validateWebEnv(env: Record<string, string | undefined>): EnvValidationResult {
  const errors: EnvValidationError[] = [];
  const warnings: EnvValidationError[] = [];

  // COLLECTOR_URL validation
  if (env.COLLECTOR_URL && !isValidUrl(env.COLLECTOR_URL)) {
    errors.push({
      variable: 'COLLECTOR_URL',
      message: 'Must be a valid URL',
      required: false,
    });
  }

  // DATABASE_URL validation (optional for web, uses D1 in production)
  if (env.DATABASE_URL && !isValidDatabaseUrl(env.DATABASE_URL)) {
    errors.push({
      variable: 'DATABASE_URL',
      message: 'Must be a valid PostgreSQL connection string',
      required: false,
    });
  }

  // INTERNAL_SECRET recommendation
  if (!env.INTERNAL_SECRET && env.NODE_ENV === 'production') {
    warnings.push({
      variable: 'INTERNAL_SECRET',
      message: 'Recommended for production to secure service-to-service calls',
      required: false,
    });
  }

  // Legacy tool URLs
  if (env.VITE_DMARC_TOOL_URL && !isValidUrl(env.VITE_DMARC_TOOL_URL)) {
    errors.push({
      variable: 'VITE_DMARC_TOOL_URL',
      message: 'Must be a valid URL',
      required: false,
    });
  }

  if (env.VITE_DKIM_TOOL_URL && !isValidUrl(env.VITE_DKIM_TOOL_URL)) {
    errors.push({
      variable: 'VITE_DKIM_TOOL_URL',
      message: 'Must be a valid URL',
      required: false,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate collector environment variables
 */
export function validateCollectorEnv(env: Record<string, string | undefined>): EnvValidationResult {
  const errors: EnvValidationError[] = [];
  const warnings: EnvValidationError[] = [];

  // DATABASE_URL is required for collector
  if (!env.DATABASE_URL) {
    errors.push({
      variable: 'DATABASE_URL',
      message: 'Required for collector to connect to database',
      required: true,
    });
  } else if (!isValidDatabaseUrl(env.DATABASE_URL)) {
    errors.push({
      variable: 'DATABASE_URL',
      message: 'Must be a valid PostgreSQL connection string',
      required: true,
    });
  }

  // PORT validation
  if (env.PORT && !isValidPort(env.PORT)) {
    errors.push({
      variable: 'PORT',
      message: 'Must be a valid port number (1-65535)',
      required: false,
    });
  }

  // INTERNAL_SECRET recommendation
  if (!env.INTERNAL_SECRET && env.NODE_ENV === 'production') {
    warnings.push({
      variable: 'INTERNAL_SECRET',
      message: 'Recommended for production to secure service-to-service calls',
      required: false,
    });
  }

  // API_KEY_SECRET recommendation
  if (!env.API_KEY_SECRET && env.NODE_ENV === 'production') {
    warnings.push({
      variable: 'API_KEY_SECRET',
      message: 'Recommended for production to validate external API keys',
      required: false,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get web environment with defaults
 */
export function getWebEnv(env: Record<string, string | undefined>): WebEnv {
  return {
    DATABASE_URL: env.DATABASE_URL,
    INTERNAL_SECRET: env.INTERNAL_SECRET,
    NODE_ENV: (env.NODE_ENV as WebEnv['NODE_ENV']) || 'development',
    COLLECTOR_URL: env.COLLECTOR_URL || 'http://localhost:3001',
    VITE_DMARC_TOOL_URL: env.VITE_DMARC_TOOL_URL,
    VITE_DKIM_TOOL_URL: env.VITE_DKIM_TOOL_URL,
  };
}

/**
 * Get collector environment with defaults
 */
export function getCollectorEnv(env: Record<string, string | undefined>): CollectorEnv {
  return {
    DATABASE_URL: env.DATABASE_URL,
    INTERNAL_SECRET: env.INTERNAL_SECRET,
    NODE_ENV: (env.NODE_ENV as CollectorEnv['NODE_ENV']) || 'development',
    PORT: env.PORT || '3001',
    API_KEY_SECRET: env.API_KEY_SECRET,
  };
}

/**
 * Format validation result for logging
 */
export function formatValidationResult(result: EnvValidationResult): string {
  const lines: string[] = [];

  if (result.valid && result.warnings.length === 0) {
    return 'Environment configuration is valid.';
  }

  if (result.errors.length > 0) {
    lines.push('Environment validation errors:');
    for (const error of result.errors) {
      const reqText = error.required ? ' (required)' : '';
      lines.push(`  - ${error.variable}${reqText}: ${error.message}`);
    }
  }

  if (result.warnings.length > 0) {
    lines.push('Environment warnings:');
    for (const warning of result.warnings) {
      lines.push(`  - ${warning.variable}: ${warning.message}`);
    }
  }

  return lines.join('\n');
}
