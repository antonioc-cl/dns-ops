/**
 * Schema Validation Test
 * 
 * Tests that verify all required database tables and columns exist.
 * This test should pass before any deployment.
 */

import { describe, it, expect, beforeAll } from 'bun:test';
import { createPostgresAdapter } from '@dns-ops/db';
import { sql } from 'drizzle-orm';

// All tables that should exist
const REQUIRED_TABLES = [
  'users',
  'sessions',
  'domains',
  'ruleset_versions',
  'snapshots',
  'observations',
  'record_sets',
  'findings',
  'suggestions',
  'domain_notes',
  'domain_tags',
  'saved_filters',
  'audit_events',
  'template_overrides',
  'monitored_domains',
  'alerts',
  'shared_reports',
  'fleet_reports',
  'probe_observations',
] as const;

// Required columns for critical tables
const TABLE_COLUMNS: Record<string, string[]> = {
  users: ['id', 'email', 'password_hash', 'tenant_id', 'created_at', 'updated_at'],
  sessions: ['id', 'token', 'user_email', 'tenant_id', 'expires_at', 'created_at'],
  domains: ['id', 'name', 'normalized_name', 'tenant_id', 'created_at', 'updated_at'],
  snapshots: ['id', 'domain_id', 'tenant_id', 'collector', 'created_at'],
  observations: ['id', 'snapshot_id', 'query_name', 'query_type', 'rcode'],
  record_sets: ['id', 'snapshot_id', 'domain_id', 'name', 'type', 'records', 'tenant_id'],
  findings: ['id', 'domain_id', 'tenant_id', 'severity', 'code', 'message'],
  suggestions: ['id', 'domain_id', 'tenant_id', 'action', 'target', 'description'],
  domain_notes: ['id', 'domain_id', 'tenant_id', 'content', 'created_by', 'created_at'],
  domain_tags: ['id', 'domain_id', 'tenant_id', 'tag', 'created_by', 'created_at'],
  monitored_domains: ['id', 'domain_id', 'schedule', 'tenant_id', 'created_by', 'created_at', 'is_active'],
  alerts: ['id', 'monitored_domain_id', 'tenant_id', 'status', 'severity', 'message'],
  audit_events: ['id', 'tenant_id', 'action', 'actor', 'created_at'],
  ruleset_versions: ['id', 'version', 'rules', 'tenant_id', 'created_at'],
  saved_filters: ['id', 'tenant_id', 'name', 'filters', 'created_by', 'created_at'],
  template_overrides: ['id', 'tenant_id', 'template_id', 'field_name', 'value', 'created_by'],
  shared_reports: ['id', 'tenant_id', 'name', 'type', 'config', 'created_by'],
  fleet_reports: ['id', 'tenant_id', 'name', 'findings', 'created_by', 'created_at'],
  probe_observations: ['id', 'tenant_id', 'domain', 'record_type', 'resolver', 'response_code'],
};

describe('Database Schema', () => {
  let db: ReturnType<typeof createClient>;

  beforeAll(() => {
    // Create database adapter for testing
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required for tests');
    }
    db = createPostgresAdapter(connectionString);
  });

  describe('Required Tables', () => {
    for (const table of REQUIRED_TABLES) {
      it(`should have ${table} table`, async () => {
        const result = await db.getDrizzle().execute(sql`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = ${table}
          ) as exists
        `);
        
        const rows = (result as any).rows;
        expect(rows[0].exists).toBe(true);
      });
    }
  });

  describe('Required Columns', () => {
    for (const [table, columns] of Object.entries(TABLE_COLUMNS)) {
      for (const column of columns) {
        it(`should have ${column} column in ${table}`, async () => {
          const result = await db.getDrizzle().execute(sql`
            SELECT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_schema = 'public' 
                AND table_name = ${table}
                AND column_name = ${column}
            ) as exists
          `);
          
          const rows = (result as any).rows;
          expect(rows[0].exists).toBe(true);
        });
      }
    }
  });

  describe('Table Constraints', () => {
    it('should have unique email constraint on users', async () => {
      const result = await db.getDrizzle().execute(sql`
        SELECT COUNT(*) as count
        FROM information_schema.table_constraints
        WHERE constraint_type = 'UNIQUE'
          AND table_name = 'users'
          AND constraint_name LIKE '%email%'
      `);
      
      const rows = (result as any).rows;
      expect(Number(rows[0].count)).toBeGreaterThan(0);
    });

    it('should have unique token constraint on sessions', async () => {
      const result = await db.getDrizzle().execute(sql`
        SELECT COUNT(*) as count
        FROM information_schema.table_constraints
        WHERE constraint_type = 'UNIQUE'
          AND table_name = 'sessions'
          AND constraint_name LIKE '%token%'
      `);
      
      const rows = (result as any).rows;
      expect(Number(rows[0].count)).toBeGreaterThan(0);
    });

    it('should have primary keys on all tables', async () => {
      for (const table of REQUIRED_TABLES) {
        const result = await db.getDrizzle().execute(sql`
          SELECT COUNT(*) as count
          FROM information_schema.table_constraints
          WHERE constraint_type = 'PRIMARY KEY'
            AND table_name = ${table}
        `);
        
        const rows = (result as any).rows;
        expect(Number(rows[0].count)).toBeGreaterThan(0);
      }
    });
  });

  describe('Foreign Keys', () => {
    it('should have domain_id foreign key in snapshots referencing domains', async () => {
      const result = await db.getDrizzle().execute(sql`
        SELECT COUNT(*) as count
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'snapshots'
          AND kcu.column_name = 'domain_id'
      `);
      
      const rows = (result as any).rows;
      expect(Number(rows[0].count)).toBeGreaterThan(0);
    });

    it('should have snapshot_id foreign key in observations', async () => {
      const result = await db.getDrizzle().execute(sql`
        SELECT COUNT(*) as count
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'observations'
          AND kcu.column_name = 'snapshot_id'
      `);
      
      const rows = (result as any).rows;
      expect(Number(rows[0].count)).toBeGreaterThan(0);
    });
  });

  describe('Indexes', () => {
    it('should have tenant_id indexes for multi-tenant tables', async () => {
      const multiTenantTables = ['domains', 'snapshots', 'findings', 'domain_notes', 'domain_tags', 'audit_events'];
      
      for (const table of multiTenantTables) {
        const result = await db.getDrizzle().execute(sql`
          SELECT COUNT(*) as count
          FROM information_schema.statistics
          WHERE table_schema = 'public'
            AND table_name = ${table}
            AND column_name = 'tenant_id'
        `);
        
        const rows = (result as any).rows;
        expect(Number(rows[0].count)).toBeGreaterThan(0);
      }
    });
  });
});
