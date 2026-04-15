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

// Run comprehensive database migrations - create tables one by one
async function runMigrationsIfNeeded(db: IDatabaseAdapter): Promise<void> {
  if (hasRunMigrations) return;
  hasRunMigrations = true;
  
  try {
    logger.info('Running database migrations...');
    
    const migrations = [
      // Users table
      sql`CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name VARCHAR(255),
        tenant_id UUID NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      
      // Sessions table
      sql`CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token VARCHAR(255) NOT NULL UNIQUE,
        user_email VARCHAR(255) NOT NULL,
        tenant_id UUID NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      
      // Domains table
      sql`CREATE TABLE IF NOT EXISTS domains (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        normalized_name VARCHAR(255) NOT NULL,
        punycode_name VARCHAR(255),
        zone_management VARCHAR(20) DEFAULT 'unknown',
        tenant_id UUID NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      
      // Ruleset versions table
      sql`CREATE TABLE IF NOT EXISTS ruleset_versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        version VARCHAR(50) NOT NULL,
        rules JSONB NOT NULL DEFAULT '[]',
        tenant_id UUID NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        created_by VARCHAR(100) NOT NULL
      )`,
      
      // Snapshots table
      sql`CREATE TABLE IF NOT EXISTS snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        domain_id UUID NOT NULL,
        tenant_id UUID NOT NULL,
        collector VARCHAR(100) NOT NULL,
        collector_version VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        metadata JSONB DEFAULT '{}'
      )`,
      
      // Observations table
      sql`CREATE TABLE IF NOT EXISTS observations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        snapshot_id UUID NOT NULL,
        query_name VARCHAR(255) NOT NULL,
        query_type VARCHAR(10) NOT NULL,
        rcode INTEGER NOT NULL,
        answer JSONB NOT NULL DEFAULT '[]',
        elapsed_ms INTEGER,
        resolver VARCHAR(255),
        collected_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      
      // Record sets table
      sql`CREATE TABLE IF NOT EXISTS record_sets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        snapshot_id UUID NOT NULL,
        domain_id UUID NOT NULL,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(10) NOT NULL,
        ttl INTEGER,
        records JSONB NOT NULL DEFAULT '[]',
        tenant_id UUID NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      
      // Findings table
      sql`CREATE TABLE IF NOT EXISTS findings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        domain_id UUID NOT NULL,
        snapshot_id UUID,
        tenant_id UUID NOT NULL,
        result_state VARCHAR(20) NOT NULL DEFAULT 'complete',
        severity VARCHAR(20) NOT NULL,
        confidence VARCHAR(20) NOT NULL,
        code VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        evidence JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      
      // Suggestions table
      sql`CREATE TABLE IF NOT EXISTS suggestions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        domain_id UUID NOT NULL,
        finding_id UUID,
        tenant_id UUID NOT NULL,
        action VARCHAR(50) NOT NULL,
        target VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        effort VARCHAR(20) DEFAULT 'medium',
        priority INTEGER DEFAULT 50,
        resolved BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      
      // Domain notes table
      sql`CREATE TABLE IF NOT EXISTS domain_notes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        domain_id UUID NOT NULL,
        tenant_id UUID NOT NULL,
        content TEXT NOT NULL,
        author VARCHAR(100),
        created_by VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      
      // Domain tags table
      sql`CREATE TABLE IF NOT EXISTS domain_tags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        domain_id UUID NOT NULL,
        tenant_id UUID NOT NULL,
        tag VARCHAR(100) NOT NULL,
        created_by VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE(domain_id, tag)
      )`,
      
      // Saved filters table
      sql`CREATE TABLE IF NOT EXISTS saved_filters (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        name VARCHAR(100) NOT NULL,
        filters JSONB NOT NULL DEFAULT '{}',
        created_by VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      
      // Audit events table
      sql`CREATE TABLE IF NOT EXISTS audit_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        action VARCHAR(100) NOT NULL,
        actor VARCHAR(100) NOT NULL,
        target_type VARCHAR(50),
        target_id UUID,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      
      // Template overrides table
      sql`CREATE TABLE IF NOT EXISTS template_overrides (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        template_id VARCHAR(100) NOT NULL,
        field_name VARCHAR(100) NOT NULL,
        value JSONB NOT NULL,
        created_by VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE(tenant_id, template_id, field_name)
      )`,
      
      // Monitored domains table
      sql`CREATE TABLE IF NOT EXISTS monitored_domains (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        domain_id UUID NOT NULL,
        schedule VARCHAR(20) NOT NULL DEFAULT 'daily',
        alert_channels JSONB DEFAULT '{}',
        max_alerts_per_day INTEGER DEFAULT 5,
        suppression_window_minutes INTEGER DEFAULT 60,
        is_active BOOLEAN DEFAULT true,
        last_check_at TIMESTAMP,
        last_alert_at TIMESTAMP,
        created_by VARCHAR(100) NOT NULL,
        tenant_id UUID NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      
      // Alerts table
      sql`CREATE TABLE IF NOT EXISTS alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        monitored_domain_id UUID NOT NULL,
        tenant_id UUID NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        severity VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        acknowledged_at TIMESTAMP
      )`,
      
      // Shared reports table
      sql`CREATE TABLE IF NOT EXISTS shared_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        config JSONB NOT NULL DEFAULT '{}',
        created_by VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        expires_at TIMESTAMP
      )`,
      
      // Fleet reports table
      sql`CREATE TABLE IF NOT EXISTS fleet_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        name VARCHAR(255) NOT NULL,
        findings JSONB NOT NULL DEFAULT '[]',
        summary JSONB DEFAULT '{}',
        created_by VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      
      // Probe observations table
      sql`CREATE TABLE IF NOT EXISTS probe_observations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        domain VARCHAR(255) NOT NULL,
        record_type VARCHAR(10) NOT NULL,
        resolver VARCHAR(255) NOT NULL,
        response_code INTEGER NOT NULL,
        response_time_ms INTEGER NOT NULL,
        nameservers JSONB DEFAULT '[]',
        observed_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
    ];
    
    for (const migration of migrations) {
      try {
        await db.getDrizzle().execute(migration);
      } catch (err) {
        // Ignore "already exists" errors
        if (!err?.message?.includes('already exists')) {
          logger.debug('Migration note:', err as Error);
        }
      }
    }
    
    // Add missing columns to existing tables
    const alters = [
      // Snapshots - add missing columns
      sql`ALTER TABLE snapshots ADD COLUMN IF NOT EXISTS tenant_id UUID`,
      sql`ALTER TABLE snapshots ADD COLUMN IF NOT EXISTS collector VARCHAR(100)`,
      // Monitored domains - add missing columns
      sql`ALTER TABLE monitored_domains ADD COLUMN IF NOT EXISTS domain_id UUID`,
      sql`ALTER TABLE monitored_domains ADD COLUMN IF NOT EXISTS created_by VARCHAR(100)`,
      sql`ALTER TABLE monitored_domains ADD COLUMN IF NOT EXISTS last_check_at TIMESTAMP`,
      sql`ALTER TABLE monitored_domains ADD COLUMN IF NOT EXISTS last_alert_at TIMESTAMP`,
      // Other tables that might need columns
      sql`ALTER TABLE domains ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'`,
    ];
    
    for (const alter of alters) {
      try {
        await db.getDrizzle().execute(alter);
      } catch (err) {
        // Ignore errors - column might already exist
      }
    }
    
    logger.info('Database migrations complete');
  } catch (err: any) {
    logger.error('Database migration error:', err as Error);
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
    
    // Run migrations in the background - don't block startup
    runMigrationsIfNeeded(db).catch(err => {
      logger.error('Background migration failed:', err);
    });
  }

  return await next();
});
