import type { IDatabaseAdapter } from '@dns-ops/db';
import { createPostgresAdapter } from '@dns-ops/db';
import { createLogger } from '@dns-ops/logging';
import { createMiddleware } from 'hono/factory';
import { getEnvConfig } from '../config/env.js';
import type { Env } from '../types.js';

const logger = createLogger({ service: 'dns-ops-web', version: '1.0.0', minLevel: 'info' });

let pgAdapter: IDatabaseAdapter | null = null;
let currentConnectionString: string | null = null;
let hasLoggedDbWarning = false;

/**
 * Check if running in Cloudflare Workers (production/staging)
 * In Workers, we have specific bindings that don't exist in Node.js
 */
function isCloudflareWorkers(env: Env['Bindings']): boolean {
  // In Workers, ASSETS binding exists and HYPERDRIVE may be configured
  return typeof env?.ASSETS !== 'undefined' || !!env?.HYPERDRIVE;
}

function getSharedPgAdapter(connectionString: string): IDatabaseAdapter {
  if (!pgAdapter || currentConnectionString !== connectionString) {
    pgAdapter = createPostgresAdapter(connectionString);
    currentConnectionString = connectionString;
  }

  return pgAdapter;
}

/**
 * DX-003: Database failfast middleware
 *
 * Behavior:
 * - Development mode (NODE_ENV=development): Fail fast - return 503 if DATABASE_URL missing
 * - Cloudflare Workers: Log warning once, return 503 for API routes if DB unavailable
 * - Non-API routes: Continue with degraded functionality (no db context)
 */
export const dbMiddleware = createMiddleware<Env>(async (c, next) => {
  const { databaseUrl, isDevelopment } = getEnvConfig(c.env);

  // Development mode: fail fast if DATABASE_URL is missing
  if (isDevelopment && !databaseUrl) {
    logger.error('DATABASE_URL is required in development mode', undefined, {
      hint: 'Set DATABASE_URL environment variable to your PostgreSQL instance',
      example: 'postgresql://user:pass@localhost:5432/dns_ops',
      code: 'DB_CONFIG_MISSING',
    });

    // For API routes, return 503 Service Unavailable
    if (c.req.path.startsWith('/api/')) {
      return c.json(
        {
          error: 'Database configuration error',
          message: 'DATABASE_URL environment variable is required in development mode',
          code: 'DB_CONFIG_MISSING',
        },
        503
      );
    }
    // For non-API routes in dev mode without DB, continue with degraded functionality
    return await next();
  }

  // Workers mode: warn once if no DB, return 503 for API routes
  if (!databaseUrl && isCloudflareWorkers(c.env)) {
    if (!hasLoggedDbWarning) {
      hasLoggedDbWarning = true;
      logger.warn('No database connection available (HYPERDRIVE or DATABASE_URL)', {
        impact: 'API routes will return 503 until database is available',
        code: 'DB_UNAVAILABLE',
      });
    }

    // API routes (except health) return 503
    if (c.req.path.startsWith('/api/') && c.req.path !== '/api/health') {
      return c.json(
        {
          error: 'Database unavailable',
          message: 'Database connection not configured',
          code: 'DB_UNAVAILABLE',
        },
        503
      );
    }
  }

  // Normal case: set DB adapter and continue
  if (databaseUrl) {
    c.set('db', getSharedPgAdapter(databaseUrl));
  }

  return await next();
});
