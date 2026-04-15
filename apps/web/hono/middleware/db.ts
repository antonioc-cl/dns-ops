import { sql } from 'drizzle-orm';
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
    logger.info('Checking database schema...');
    
    // Create users table if it doesn't exist
    await db.getDrizzle().execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name VARCHAR(255),
        tenant_id UUID NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    
    logger.info('Users table created or already exists');
    
    // Create sessions table if it doesn't exist
    await db.getDrizzle().execute(sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token VARCHAR(255) NOT NULL UNIQUE,
        user_email VARCHAR(255) NOT NULL,
        tenant_id UUID NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    
    logger.info('Sessions table created or already exists');
    
    // Create monitored_domains table - use DO block to handle existing table
    try {
      await db.getDrizzle().execute(sql`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'monitored_domains') THEN
            CREATE TABLE monitored_domains (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              domain_id UUID NOT NULL,
              schedule VARCHAR(20) NOT NULL DEFAULT 'daily',
              alert_channels JSONB NOT NULL DEFAULT '{}',
              max_alerts_per_day INTEGER NOT NULL DEFAULT 5,
              suppression_window_minutes INTEGER NOT NULL DEFAULT 60,
              is_active BOOLEAN NOT NULL DEFAULT true,
              last_check_at TIMESTAMP WITH TIME ZONE,
              last_alert_at TIMESTAMP WITH TIME ZONE,
              created_by VARCHAR(100) NOT NULL,
              tenant_id UUID NOT NULL,
              created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );
          ELSE
            -- Add missing columns to existing table
            ALTER TABLE monitored_domains ADD COLUMN IF NOT EXISTS domain_id UUID;
            ALTER TABLE monitored_domains ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);
            ALTER TABLE monitored_domains ADD COLUMN IF NOT EXISTS last_check_at TIMESTAMP WITH TIME ZONE;
            ALTER TABLE monitored_domains ADD COLUMN IF NOT EXISTS last_alert_at TIMESTAMP WITH TIME ZONE;
            ALTER TABLE monitored_domains ALTER COLUMN created_by SET NOT NULL;
          END IF;
        END
        $$;
      `);
      logger.info('Monitored domains table created/updated');
    } catch (err) {
      logger.debug('Monitored domains migration note:', err as Error);
    }
    
    logger.info('Database adapter initialized');
  } catch (err: any) {
    // Ignore "already exists" errors
    if (err.message?.includes('already exists')) {
      logger.info('Tables already exist');
      return;
    }
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
