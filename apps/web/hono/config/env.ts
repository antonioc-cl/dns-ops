/**
 * Environment Configuration and Validation
 *
 * Fail-fast validation for required runtime configuration.
 * This module validates environment variables at startup and provides
 * typed access to configuration values.
 *
 * Environment modes:
 * - Production (Cloudflare Workers): Uses D1 binding, wrangler vars
 * - Development (Node.js): Uses process.env, PostgreSQL
 */

/**
 * Environment variable definitions with validation rules
 */
interface EnvVarDef {
  name: string;
  required: boolean | 'development' | 'production';
  description: string;
  validate?: (value: string) => string | null; // Returns error message or null if valid
  default?: string;
}

/**
 * All environment variables used by the web app
 */
const ENV_VARS: EnvVarDef[] = [
  {
    name: 'NODE_ENV',
    required: false,
    description: 'Runtime environment (development/production/test)',
    validate: (v) => {
      const valid = ['development', 'production', 'test'];
      return valid.includes(v) ? null : `Must be one of: ${valid.join(', ')}`;
    },
    default: 'production',
  },
  {
    name: 'DATABASE_URL',
    required: 'development',
    description: 'PostgreSQL connection URL for local development',
    validate: (v) => {
      if (!v.startsWith('postgresql://') && !v.startsWith('postgres://')) {
        return 'Must be a valid PostgreSQL URL (postgresql://... or postgres://...)';
      }
      return null;
    },
  },
  {
    name: 'COLLECTOR_URL',
    required: true,
    description: 'URL for the DNS/mail collector service',
    validate: (v) => {
      try {
        new URL(v);
        return null;
      } catch {
        return 'Must be a valid URL';
      }
    },
    default: 'http://localhost:3001',
  },
  {
    name: 'INTERNAL_SECRET',
    required: 'production',
    description: 'Shared secret for internal service-to-service authentication',
    validate: (v) => {
      if (v.length < 16) {
        return 'Must be at least 16 characters for security';
      }
      return null;
    },
  },
];

/**
 * Validation error for a single environment variable
 */
interface EnvError {
  name: string;
  error: string;
  description: string;
}

/**
 * Result of environment validation
 */
interface ValidationResult {
  valid: boolean;
  errors: EnvError[];
  warnings: string[];
  environment: 'development' | 'production' | 'test';
}

/**
 * Check if a variable is required in the current environment
 */
function isRequired(def: EnvVarDef, env: 'development' | 'production' | 'test'): boolean {
  if (def.required === true) return true;
  if (def.required === false) return false;
  return def.required === env;
}

/**
 * Validate all environment variables
 *
 * @param processEnv - The process.env object (or mock for testing)
 * @returns Validation result with errors and warnings
 */
export function validateEnv(
  processEnv: Record<string, string | undefined> = process.env
): ValidationResult {
  const errors: EnvError[] = [];
  const warnings: string[] = [];

  // Determine environment first
  const nodeEnv = processEnv.NODE_ENV || 'production';
  const environment = nodeEnv as 'development' | 'production' | 'test';

  for (const def of ENV_VARS) {
    const value = processEnv[def.name];
    const required = isRequired(def, environment);

    // Check if required variable is missing
    if (required && !value) {
      errors.push({
        name: def.name,
        error: 'Required but not set',
        description: def.description,
      });
      continue;
    }

    // Skip validation if not set and not required
    if (!value) {
      if (def.default) {
        // Has default, no warning needed
      } else if (def.required === 'production' && environment === 'development') {
        warnings.push(`${def.name} not set (required in production): ${def.description}`);
      }
      continue;
    }

    // Run custom validation if provided
    if (def.validate) {
      const validationError = def.validate(value);
      if (validationError) {
        errors.push({
          name: def.name,
          error: validationError,
          description: def.description,
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    environment,
  };
}

/**
 * Format validation errors as a readable string
 */
export function formatValidationErrors(result: ValidationResult): string {
  const lines: string[] = [
    '',
    '╔════════════════════════════════════════════════════════════════╗',
    '║           ENVIRONMENT CONFIGURATION ERROR                      ║',
    '╚════════════════════════════════════════════════════════════════╝',
    '',
    `Environment: ${result.environment}`,
    '',
  ];

  if (result.errors.length > 0) {
    lines.push('ERRORS (startup blocked):');
    lines.push('─'.repeat(60));
    for (const err of result.errors) {
      lines.push(`  ✗ ${err.name}`);
      lines.push(`    Error: ${err.error}`);
      lines.push(`    Purpose: ${err.description}`);
      lines.push('');
    }
  }

  if (result.warnings.length > 0) {
    lines.push('WARNINGS:');
    lines.push('─'.repeat(60));
    for (const warn of result.warnings) {
      lines.push(`  ⚠ ${warn}`);
    }
    lines.push('');
  }

  lines.push('─'.repeat(60));
  lines.push('Fix the errors above and restart the application.');
  lines.push('');

  return lines.join('\n');
}

/**
 * Validate environment and throw if invalid
 *
 * Call this at application startup to fail fast with clear messages.
 *
 * @throws Error with formatted message if validation fails
 */
export function assertEnvValid(processEnv: Record<string, string | undefined> = process.env): void {
  const result = validateEnv(processEnv);

  // Log warnings even if valid
  if (result.warnings.length > 0) {
    console.warn('[ENV] Warnings:');
    for (const warn of result.warnings) {
      console.warn(`  ⚠ ${warn}`);
    }
  }

  if (!result.valid) {
    const message = formatValidationErrors(result);
    console.error(message);
    throw new Error(`Environment validation failed: ${result.errors.length} error(s)`);
  }
}

/**
 * Get typed environment configuration
 *
 * Returns the current environment values with proper typing.
 * Uses defaults where appropriate.
 */
export function getEnvConfig(processEnv: Record<string, string | undefined> = process.env): {
  nodeEnv: 'development' | 'production' | 'test';
  databaseUrl: string | undefined;
  collectorUrl: string;
  internalSecret: string | undefined;
  isDevelopment: boolean;
  isProduction: boolean;
} {
  const nodeEnv = (processEnv.NODE_ENV || 'production') as 'development' | 'production' | 'test';

  return {
    nodeEnv,
    databaseUrl: processEnv.DATABASE_URL,
    collectorUrl: processEnv.COLLECTOR_URL || 'http://localhost:3001',
    internalSecret: processEnv.INTERNAL_SECRET,
    isDevelopment: nodeEnv === 'development',
    isProduction: nodeEnv === 'production',
  };
}

/**
 * Environment variable names for documentation/tooling
 */
export const ENV_VAR_NAMES = ENV_VARS.map((v) => v.name);

/**
 * Get documentation for all environment variables
 */
export function getEnvDocs(): Array<{
  name: string;
  required: string;
  description: string;
  default?: string;
}> {
  return ENV_VARS.map((v) => ({
    name: v.name,
    required:
      v.required === true ? 'always' : v.required === false ? 'optional' : `in ${v.required}`,
    description: v.description,
    default: v.default,
  }));
}
