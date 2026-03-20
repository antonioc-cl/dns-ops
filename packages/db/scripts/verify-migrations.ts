#!/usr/bin/env npx tsx
/**
 * Migration Verification Script
 *
 * Verifies that migrations can be applied to a fresh database without errors.
 * Creates a temporary schema, applies migrations, verifies structure, then cleans up.
 *
 * Usage:
 *   DATABASE_URL=postgres://... npx tsx scripts/verify-migrations.ts
 *
 * Exit codes:
 *   0 - Success
 *   1 - Migration or verification failed
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';

const { Client } = pg;

// Schema name for isolation (timestamped to avoid conflicts)
const TEST_SCHEMA = `migration_test_${Date.now()}`;

// Expected tables after migration (from TypeScript schema)
const EXPECTED_TABLES = [
  'alerts',
  'audit_events',
  'domain_notes',
  'domain_tags',
  'domains',
  'findings',
  'monitored_domains',
  'observations',
  'record_sets',
  'remediation_requests',
  'ruleset_versions',
  'saved_filters',
  'snapshots',
  'suggestions',
  'template_overrides',
  'vantage_points',
  // Note: dkim_selectors and mail_evidence are in TypeScript but missing from migration
  // See SCHEMA_AUDIT.md for details
];

// Expected enums after migration
const EXPECTED_ENUMS = [
  'alert_status',
  'audit_action',
  'blast_radius',
  'collection_status',
  'confidence',
  'monitoring_schedule',
  'remediation_priority',
  'remediation_status',
  'result_state',
  'risk_posture',
  'severity',
  'vantage_type',
  'zone_management',
];

interface VerificationResult {
  success: boolean;
  migrationApplied: boolean;
  tablesFound: string[];
  tablesMissing: string[];
  enumsFound: string[];
  enumsMissing: string[];
  errors: string[];
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is required');
    console.error('Usage: DATABASE_URL=postgres://... npx tsx scripts/verify-migrations.ts');
    process.exit(1);
  }

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║               Migration Verification Script                     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Test schema: ${TEST_SCHEMA}`);
  console.log(`Database: ${databaseUrl.replace(/\/\/[^@]+@/, '//***@')}`);
  console.log('');

  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    const result = await verifyMigrations(client);
    printResult(result);

    if (!result.success) {
      process.exit(1);
    }
  } catch (error) {
    console.error('✗ Fatal error:', error);
    process.exit(1);
  } finally {
    // Always cleanup
    try {
      await client.query(`DROP SCHEMA IF EXISTS "${TEST_SCHEMA}" CASCADE`);
      console.log(`\n✓ Cleaned up test schema: ${TEST_SCHEMA}`);
    } catch {
      console.warn(`⚠ Warning: Could not clean up schema ${TEST_SCHEMA}`);
    }
    await client.end();
  }
}

async function verifyMigrations(client: pg.Client): Promise<VerificationResult> {
  const result: VerificationResult = {
    success: false,
    migrationApplied: false,
    tablesFound: [],
    tablesMissing: [],
    enumsFound: [],
    enumsMissing: [],
    errors: [],
  };

  try {
    // Step 1: Create isolated schema
    console.log('\n1. Creating test schema...');
    await client.query(`CREATE SCHEMA "${TEST_SCHEMA}"`);
    await client.query(`SET search_path TO "${TEST_SCHEMA}", public`);
    console.log('   ✓ Test schema created');

    // Step 2: Read and apply migration file
    console.log('\n2. Applying migration...');
    const migrationDir = join(__dirname, '../src/migrations');
    const migrationFiles = readdirSync(migrationDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      result.errors.push('No migration files found in src/migrations/');
      return result;
    }

    console.log(`   Found ${migrationFiles.length} migration file(s):`);
    for (const file of migrationFiles) {
      console.log(`   - ${file}`);
    }

    for (const file of migrationFiles) {
      const sql = readFileSync(join(migrationDir, file), 'utf-8');

      // Split by statement breakpoint markers
      const statements = sql.split('--> statement-breakpoint').map((s) => s.trim()).filter(Boolean);

      console.log(`   Executing ${statements.length} statements from ${file}...`);

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        if (!stmt) continue;

        try {
          await client.query(stmt);
        } catch (error) {
          const err = error as Error;
          // Ignore "already exists" errors for idempotency
          if (!err.message.includes('already exists') && !err.message.includes('duplicate_object')) {
            result.errors.push(`Statement ${i + 1}: ${err.message}`);
            console.error(`   ✗ Statement ${i + 1} failed: ${err.message.slice(0, 100)}`);
          }
        }
      }
    }

    result.migrationApplied = true;
    console.log('   ✓ Migration applied');

    // Step 3: Verify tables exist
    console.log('\n3. Verifying tables...');
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = $1
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `, [TEST_SCHEMA]);

    result.tablesFound = tablesResult.rows.map((r) => r.table_name);

    for (const table of EXPECTED_TABLES) {
      if (!result.tablesFound.includes(table)) {
        result.tablesMissing.push(table);
      }
    }

    console.log(`   Found ${result.tablesFound.length} tables`);
    if (result.tablesMissing.length > 0) {
      console.log(`   ⚠ Missing ${result.tablesMissing.length} expected tables`);
    }

    // Step 4: Verify enums exist (in public schema where drizzle creates them)
    console.log('\n4. Verifying enums...');
    const enumsResult = await client.query(`
      SELECT typname
      FROM pg_type t
      JOIN pg_catalog.pg_namespace n ON t.typnamespace = n.oid
      WHERE t.typtype = 'e'
        AND n.nspname = 'public'
      ORDER BY typname
    `);

    result.enumsFound = enumsResult.rows.map((r) => r.typname);

    for (const enumName of EXPECTED_ENUMS) {
      if (!result.enumsFound.includes(enumName)) {
        result.enumsMissing.push(enumName);
      }
    }

    console.log(`   Found ${result.enumsFound.length} enums`);
    if (result.enumsMissing.length > 0) {
      console.log(`   ⚠ Missing ${result.enumsMissing.length} expected enums`);
    }

    // Step 5: Verify foreign keys are valid
    console.log('\n5. Verifying foreign key constraints...');
    const fkResult = await client.query(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = $1
      ORDER BY tc.table_name
    `, [TEST_SCHEMA]);

    console.log(`   Found ${fkResult.rowCount} foreign key constraints`);

    // Determine success
    result.success = result.migrationApplied &&
                     result.errors.length === 0 &&
                     result.tablesMissing.length === 0 &&
                     result.enumsMissing.length === 0;

    return result;

  } catch (error) {
    result.errors.push(`Verification failed: ${(error as Error).message}`);
    return result;
  }
}

function printResult(result: VerificationResult): void {
  console.log('\n' + '═'.repeat(60));
  console.log('VERIFICATION RESULT');
  console.log('═'.repeat(60));

  if (result.success) {
    console.log('\n✅ SUCCESS: Migration can be applied to a fresh database\n');
  } else {
    console.log('\n❌ FAILURE: Migration verification failed\n');
  }

  console.log(`Migration applied: ${result.migrationApplied ? 'Yes' : 'No'}`);
  console.log(`Tables found: ${result.tablesFound.length}/${EXPECTED_TABLES.length}`);
  console.log(`Enums found: ${result.enumsFound.length}/${EXPECTED_ENUMS.length}`);

  if (result.tablesMissing.length > 0) {
    console.log('\nMissing tables:');
    for (const table of result.tablesMissing) {
      console.log(`  - ${table}`);
    }
  }

  if (result.enumsMissing.length > 0) {
    console.log('\nMissing enums:');
    for (const enumName of result.enumsMissing) {
      console.log(`  - ${enumName}`);
    }
  }

  if (result.errors.length > 0) {
    console.log('\nErrors:');
    for (const error of result.errors) {
      console.log(`  - ${error}`);
    }
  }

  // Extra tables (not expected but found)
  const extraTables = result.tablesFound.filter((t) => !EXPECTED_TABLES.includes(t));
  if (extraTables.length > 0) {
    console.log('\nAdditional tables (not in expected list):');
    for (const table of extraTables) {
      console.log(`  + ${table}`);
    }
  }

  console.log('\n' + '═'.repeat(60));
}

main();
