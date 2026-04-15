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

// Run comprehensive database migrations
async function runMigrationsIfNeeded(db: IDatabaseAdapter): Promise<void> {
  if (hasRunMigrations) return;
  hasRunMigrations = true;
  
  try {
    logger.info('Running database migrations...');
    
    // Create all tables using DO block
    await db.getDrizzle().execute(sql`
      DO $$
      BEGIN
        -- Users table
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
          CREATE TABLE users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            name VARCHAR(255),
            tenant_id UUID NOT NULL,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMP DEFAULT NOW() NOT NULL
          );
        END IF;
        
        -- Sessions table
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sessions') THEN
          CREATE TABLE sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            token VARCHAR(255) NOT NULL UNIQUE,
            user_email VARCHAR(255) NOT NULL,
            tenant_id UUID NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL
          );
        END IF;
        
        -- Domains table
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'domains') THEN
          CREATE TABLE domains (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            normalized_name VARCHAR(255) NOT NULL,
            punycode_name VARCHAR(255),
            zone_management VARCHAR(20) DEFAULT 'unknown',
            tenant_id UUID NOT NULL,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMP DEFAULT NOW() NOT NULL
          );
          CREATE INDEX domains_tenant_idx ON domains(tenant_id);
          CREATE INDEX domains_normalized_idx ON domains(normalized_name);
        END IF;
        
        -- Ruleset versions table
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ruleset_versions') THEN
          CREATE TABLE ruleset_versions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            version VARCHAR(50) NOT NULL,
            rules JSONB NOT NULL DEFAULT '[]',
            tenant_id UUID NOT NULL,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL,
            created_by VARCHAR(100) NOT NULL
          );
          CREATE INDEX ruleset_tenant_idx ON ruleset_versions(tenant_id);
        END IF;
        
        -- Snapshots table
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'snapshots') THEN
          CREATE TABLE snapshots (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
            tenant_id UUID NOT NULL,
            collector VARCHAR(100) NOT NULL,
            collector_version VARCHAR(50),
            created_at TIMESTAMP DEFAULT NOW() NOT NULL,
            metadata JSONB DEFAULT '{}'
          );
          CREATE INDEX snapshots_domain_idx ON snapshots(domain_id);
          CREATE INDEX snapshots_tenant_idx ON snapshots(tenant_id);
          CREATE INDEX snapshots_created_idx ON snapshots(created_at DESC);
        END IF;
        
        -- Observations table
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'observations') THEN
          CREATE TABLE observations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            snapshot_id UUID NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
            query_name VARCHAR(255) NOT NULL,
            query_type VARCHAR(10) NOT NULL,
            rcode INTEGER NOT NULL,
            answer JSONB NOT NULL DEFAULT '[]',
            elapsed_ms INTEGER,
            resolver VARCHAR(255),
            collected_at TIMESTAMP DEFAULT NOW() NOT NULL
          );
          CREATE INDEX obs_snapshot_idx ON observations(snapshot_id);
        END IF;
        
        -- Record sets table
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'record_sets') THEN
          CREATE TABLE record_sets (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            snapshot_id UUID NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
            domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            type VARCHAR(10) NOT NULL,
            ttl INTEGER,
            records JSONB NOT NULL DEFAULT '[]',
            tenant_id UUID NOT NULL,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL
          );
          CREATE INDEX rs_snapshot_idx ON record_sets(snapshot_id);
          CREATE INDEX rs_domain_idx ON record_sets(domain_id);
          CREATE INDEX rs_tenant_idx ON record_sets(tenant_id);
        END IF;
        
        -- Findings table
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'findings') THEN
          CREATE TABLE findings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
            snapshot_id UUID REFERENCES snapshots(id) ON DELETE SET NULL,
            tenant_id UUID NOT NULL,
            result_state VARCHAR(20) NOT NULL DEFAULT 'complete',
            severity VARCHAR(20) NOT NULL,
            confidence VARCHAR(20) NOT NULL,
            code VARCHAR(100) NOT NULL,
            message TEXT NOT NULL,
            evidence JSONB DEFAULT '{}',
            created_at TIMESTAMP DEFAULT NOW() NOT NULL
          );
          CREATE INDEX findings_domain_idx ON findings(domain_id);
          CREATE INDEX findings_tenant_idx ON findings(tenant_id);
          CREATE INDEX findings_severity_idx ON findings(severity);
        END IF;
        
        -- Suggestions table
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'suggestions') THEN
          CREATE TABLE suggestions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
            finding_id UUID REFERENCES findings(id) ON DELETE SET NULL,
            tenant_id UUID NOT NULL,
            action VARCHAR(50) NOT NULL,
            target VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            effort VARCHAR(20) DEFAULT 'medium',
            priority INTEGER DEFAULT 50,
            resolved BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL
          );
          CREATE INDEX sug_domain_idx ON suggestions(domain_id);
          CREATE INDEX sug_tenant_idx ON suggestions(tenant_id);
        END IF;
        
        -- Domain notes table
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'domain_notes') THEN
          CREATE TABLE domain_notes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
            tenant_id UUID NOT NULL,
            content TEXT NOT NULL,
            author VARCHAR(100),
            created_by VARCHAR(100) NOT NULL,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMP DEFAULT NOW() NOT NULL
          );
          CREATE INDEX dn_domain_idx ON domain_notes(domain_id);
          CREATE INDEX dn_tenant_idx ON domain_notes(tenant_id);
        END IF;
        
        -- Domain tags table
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'domain_tags') THEN
          CREATE TABLE domain_tags (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
            tenant_id UUID NOT NULL,
            tag VARCHAR(100) NOT NULL,
            created_by VARCHAR(100) NOT NULL,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL,
            UNIQUE(domain_id, tag)
          );
          CREATE INDEX dt_domain_idx ON domain_tags(domain_id);
          CREATE INDEX dt_tenant_idx ON domain_tags(tenant_id);
        END IF;
        
        -- Saved filters table
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'saved_filters') THEN
          CREATE TABLE saved_filters (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            name VARCHAR(100) NOT NULL,
            filters JSONB NOT NULL DEFAULT '{}',
            created_by VARCHAR(100) NOT NULL,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL
          );
        END IF;
        
        -- Audit events table
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_events') THEN
          CREATE TABLE audit_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            action VARCHAR(100) NOT NULL,
            actor VARCHAR(100) NOT NULL,
            target_type VARCHAR(50),
            target_id UUID,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP DEFAULT NOW() NOT NULL
          );
          CREATE INDEX audit_tenant_idx ON audit_events(tenant_id);
          CREATE INDEX audit_action_idx ON audit_events(action);
        END IF;
        
        -- Template overrides table
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'template_overrides') THEN
          CREATE TABLE template_overrides (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            template_id VARCHAR(100) NOT NULL,
            field_name VARCHAR(100) NOT NULL,
            value JSONB NOT NULL,
            created_by VARCHAR(100) NOT NULL,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL,
            UNIQUE(tenant_id, template_id, field_name)
          );
        END IF;
        
        -- Monitored domains table
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'monitored_domains') THEN
          CREATE TABLE monitored_domains (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
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
          );
          CREATE INDEX md_domain_idx ON monitored_domains(domain_id);
          CREATE INDEX md_tenant_idx ON monitored_domains(tenant_id);
        END IF;
        
        -- Alerts table
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'alerts') THEN
          CREATE TABLE alerts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            monitored_domain_id UUID NOT NULL REFERENCES monitored_domains(id) ON DELETE CASCADE,
            tenant_id UUID NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            severity VARCHAR(20) NOT NULL,
            message TEXT NOT NULL,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP DEFAULT NOW() NOT NULL,
            acknowledged_at TIMESTAMP
          );
          CREATE INDEX alerts_domain_idx ON alerts(monitored_domain_id);
          CREATE INDEX alerts_tenant_idx ON alerts(tenant_id);
        END IF;
        
        -- Shared reports table
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shared_reports') THEN
          CREATE TABLE shared_reports (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            name VARCHAR(255) NOT NULL,
            type VARCHAR(50) NOT NULL,
            config JSONB NOT NULL DEFAULT '{}',
            created_by VARCHAR(100) NOT NULL,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL,
            expires_at TIMESTAMP
          );
          CREATE INDEX sr_tenant_idx ON shared_reports(tenant_id);
        END IF;
        
        -- Fleet reports table
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fleet_reports') THEN
          CREATE TABLE fleet_reports (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            name VARCHAR(255) NOT NULL,
            findings JSONB NOT NULL DEFAULT '[]',
            summary JSONB DEFAULT '{}',
            created_by VARCHAR(100) NOT NULL,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL
          );
          CREATE INDEX fr_tenant_idx ON fleet_reports(tenant_id);
        END IF;
        
        -- Probe observations table
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'probe_observations') THEN
          CREATE TABLE probe_observations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            domain VARCHAR(255) NOT NULL,
            record_type VARCHAR(10) NOT NULL,
            resolver VARCHAR(255) NOT NULL,
            response_code INTEGER NOT NULL,
            response_time_ms INTEGER NOT NULL,
            nameservers JSONB DEFAULT '[]',
            observed_at TIMESTAMP DEFAULT NOW() NOT NULL
          );
          CREATE INDEX po_tenant_idx ON probe_observations(tenant_id);
          CREATE INDEX po_domain_idx ON probe_observations(domain);
        END IF;
        
      END IF;
      END $$;
    `);
    
    logger.info('All database tables created or already exist');
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
    
    // Run migrations
    await runMigrationsIfNeeded(db);
  }

  return await next();
});
