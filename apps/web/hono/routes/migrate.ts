/**
 * Database Migration Tests
 * 
 * Tests that verify all required database tables exist
 * and have the correct schema.
 */

import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import type { Env } from '../types.js';

const migrateRoutes = new Hono<Env>();

// All tables that should exist in the database
const REQUIRED_TABLES = [
  // Core domain tables
  'users',
  'sessions',
  'domains',
  'ruleset_versions',
  'snapshots',
  'observations',
  'record_sets',
  'findings',
  'suggestions',
  
  // Portfolio tables
  'domain_notes',
  'domain_tags',
  'saved_filters',
  'audit_events',
  'template_overrides',
  
  // Monitoring tables
  'monitored_domains',
  'alerts',
  
  // Reporting tables
  'shared_reports',
  'fleet_reports',
  'probe_observations',
];

// Critical columns for each table (table -> required columns)
const CRITICAL_COLUMNS: Record<string, string[]> = {
  users: ['id', 'email', 'password_hash', 'tenant_id'],
  sessions: ['id', 'token', 'user_email', 'tenant_id', 'expires_at'],
  domains: ['id', 'name', 'normalized_name', 'tenant_id'],
  snapshots: ['id', 'domain_id', 'tenant_id', 'collector'],
  monitored_domains: ['id', 'domain_id', 'schedule', 'tenant_id', 'created_by'],
  domain_notes: ['id', 'domain_id', 'tenant_id', 'content', 'created_by'],
  domain_tags: ['id', 'domain_id', 'tenant_id', 'tag'],
  findings: ['id', 'domain_id', 'tenant_id', 'severity', 'code'],
  observations: ['id', 'snapshot_id', 'query_name', 'query_type', 'rcode'],
  record_sets: ['id', 'snapshot_id', 'domain_id', 'name', 'type'],
  suggestions: ['id', 'domain_id', 'tenant_id', 'action', 'target'],
  alerts: ['id', 'monitored_domain_id', 'tenant_id', 'status', 'severity'],
  ruleset_versions: ['id', 'version', 'rules', 'tenant_id'],
  saved_filters: ['id', 'tenant_id', 'name', 'filters'],
  audit_events: ['id', 'tenant_id', 'action', 'actor'],
  template_overrides: ['id', 'tenant_id', 'template_id', 'field_name'],
  shared_reports: ['id', 'tenant_id', 'name', 'type'],
  fleet_reports: ['id', 'tenant_id', 'name', 'findings'],
  probe_observations: ['id', 'tenant_id', 'domain', 'record_type'],
};

/**
 * GET /api/migrate/status
 * Check if database is accessible and has required tables
 */
migrateRoutes.get('/status', async (c) => {
  const db = c.get('db');
  if (!db) {
    return c.json({ error: 'Database not available' }, 503);
  }

  try {
    // Check all required tables
    const results = await db.getDrizzle().execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const rows = results as unknown as { table_name: string }[];
    const existingTables = rows.map(r => r.table_name);
    const missingTables = REQUIRED_TABLES.filter(t => !existingTables.includes(t));
    
    if (missingTables.length > 0) {
      return c.json({ 
        status: 'incomplete', 
        missingTables,
        existingTables,
        message: `Missing tables: ${missingTables.join(', ')}`
      }, 200);
    }
    
    return c.json({ 
      status: 'complete', 
      tables: REQUIRED_TABLES.length,
      message: 'All required tables exist'
    });
  } catch (err: any) {
    return c.json({ status: 'error', message: err.message }, 500);
  }
});

/**
 * GET /api/migrate/schema
 * Check schema for each table
 */
migrateRoutes.get('/schema', async (c) => {
  const db = c.get('db');
  if (!db) {
    return c.json({ error: 'Database not available' }, 503);
  }

  try {
    const schemaResults: Record<string, { columns: string[]; missing: string[] }> = {};
    
    for (const [table, requiredCols] of Object.entries(CRITICAL_COLUMNS)) {
      const colResults = await db.getDrizzle().execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = ${table} AND table_schema = 'public'
      `);
      
      const colRows = colResults as unknown as { column_name: string }[];
      const existingCols = colRows.map(r => r.column_name);
      const missing = requiredCols.filter(c => !existingCols.includes(c));
      
      schemaResults[table] = {
        columns: existingCols,
        missing
      };
    }
    
    const tablesWithMissing = Object.entries(schemaResults)
      .filter(([, data]) => data.missing.length > 0)
      .map(([table, data]) => ({ table, missing: data.missing }));
    
    if (tablesWithMissing.length > 0) {
      return c.json({ 
        status: 'incomplete',
        issues: tablesWithMissing,
        message: `${tablesWithMissing.length} tables have missing columns`
      }, 200);
    }
    
    return c.json({ 
      status: 'complete',
      tablesChecked: Object.keys(CRITICAL_COLUMNS).length,
      message: 'All tables have required columns'
    });
  } catch (err: any) {
    return c.json({ status: 'error', message: err.message }, 500);
  }
});

export default migrateRoutes;
