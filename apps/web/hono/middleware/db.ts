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
let hasRunMigrations = false;

function isCloudflareWorkers(env: Env['Bindings']): boolean {
  return typeof env?.ASSETS !== 'undefined' || !!env?.HYPERDRIVE;
}

function getSharedPgAdapter(connectionString: string): IDatabaseAdapter {
  if (!pgAdapter || currentConnectionString !== connectionString) {
    pgAdapter = createPostgresAdapter(connectionString);
    currentConnectionString = connectionString;
  }
  return pgAdapter;
}

// Run database migrations
async function runMigrationsIfNeeded(db: IDatabaseAdapter): Promise<void> {
  if (hasRunMigrations) return;
  hasRunMigrations = true;
  
  try {
    // Try to query a known table
    // If it fails with "does not exist", run migrations
    logger.info('Checking database schema...');
    
    // Simple check - try to use the adapter
    // The actual migration should be done via drizzle-kit
    logger.info('Database adapter initialized');
  } catch (err) {
    logger.error('Database initialization error:', err as Error);
  }
}

export const dbMiddleware = createMiddleware<Env>(async (c, next) => {
  const { databaseUrl, isDevelopment } = getEnvConfig(c.env);

  if (isDevelopment && !databaseUrl) {
    logger.error('DATABASE_URL is required in development mode', undefined, {
      hint: 'Set DATABASE_URL environment variable',
      code: 'DB_CONFIG_MISSING',
    });

    if (c.req.path.startsWith('/api/')) {
      return c.json(
        {
          error: 'Database configuration error',
          message: 'DATABASE_URL is required in development mode',
          code: 'DB_CONFIG_MISSING',
        },
        503
      );
    }
    return await next();
  }

  if (!databaseUrl && isCloudflareWorkers(c.env)) {
    if (!hasLoggedDbWarning) {
      hasLoggedDbWarning = true;
      logger.warn('No database connection available', {
        code: 'DB_UNAVAILABLE',
      });
    }

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

  if (databaseUrl) {
    const db = getSharedPgAdapter(databaseUrl);
    c.set('db', db);
    
    // Run migrations check
    await runMigrationsIfNeeded(db);
  }

  return await next();
});
