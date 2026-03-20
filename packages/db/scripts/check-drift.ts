#!/usr/bin/env npx tsx
/**
 * Schema Drift Check
 *
 * Detects divergence between TypeScript schema definitions and SQL migrations.
 * Uses drizzle-kit to generate migrations to a temp directory and checks if
 * any new SQL is produced (indicating the schema has changed without migration).
 *
 * Usage:
 *   npx tsx scripts/check-drift.ts
 *
 * CI Integration:
 *   Add to CI workflow:
 *   ```yaml
 *   - name: Check schema drift
 *     run: |
 *       cd packages/db
 *       bun run build
 *       npx tsx scripts/check-drift.ts
 *   ```
 *
 * Exit codes:
 *   0 - No drift detected (schema matches migrations)
 *   1 - Drift detected or error occurred
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEMP_DIR = join(__dirname, '../.drift-check-temp');
const MIGRATIONS_DIR = join(__dirname, '../src/migrations');

interface DriftCheckResult {
  hasDrift: boolean;
  existingMigrations: string[];
  generatedFiles: string[];
  driftDetails: string[];
}

function cleanup(): void {
  if (existsSync(TEMP_DIR)) {
    rmSync(TEMP_DIR, { recursive: true, force: true });
  }
}

function ensureDistExists(): boolean {
  const distPath = join(__dirname, '../dist/schema/index.js');
  if (!existsSync(distPath)) {
    console.error('❌ Error: dist/schema/index.js not found');
    console.error('   Run "bun run build" first to compile TypeScript schema');
    return false;
  }
  return true;
}

function getExistingMigrations(): string[] {
  if (!existsSync(MIGRATIONS_DIR)) {
    return [];
  }
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

function generateToTemp(): { success: boolean; error?: string } {
  cleanup();
  mkdirSync(TEMP_DIR, { recursive: true });

  try {
    // Create a temporary drizzle config that outputs to temp directory
    const tempConfig = `
import type { Config } from 'drizzle-kit';

export default {
  schema: './dist/schema/index.js',
  out: '${TEMP_DIR}',
  driver: 'pg',
  dbCredentials: {
    connectionString: 'postgres://localhost:5432/dns_ops_drift_check',
  },
  verbose: false,
  strict: true,
} satisfies Config;
`;

    const tempConfigPath = join(__dirname, '../drizzle.drift-check.config.ts');
    require('fs').writeFileSync(tempConfigPath, tempConfig);

    try {
      // Run drizzle-kit generate with temp config
      execSync(`npx drizzle-kit generate --config=${tempConfigPath}`, {
        cwd: join(__dirname, '..'),
        stdio: 'pipe',
        encoding: 'utf-8',
      });
    } finally {
      // Clean up temp config
      if (existsSync(tempConfigPath)) {
        rmSync(tempConfigPath);
      }
    }

    return { success: true };
  } catch (error) {
    const err = error as Error & { stderr?: string; stdout?: string };
    // drizzle-kit returns non-zero if nothing to generate (no changes)
    // Check if it's actually an error or just "nothing to do"
    if (err.stderr?.includes('No schema changes') || err.stdout?.includes('No schema changes')) {
      return { success: true };
    }
    // If the error is about missing journal or empty migrations, that's fine
    if (err.stderr?.includes('journal') || err.stdout?.includes('journal')) {
      return { success: true };
    }
    return { success: false, error: err.message };
  }
}

function checkForNewMigrations(): DriftCheckResult {
  const result: DriftCheckResult = {
    hasDrift: false,
    existingMigrations: getExistingMigrations(),
    generatedFiles: [],
    driftDetails: [],
  };

  // Check what was generated in temp directory
  if (!existsSync(TEMP_DIR)) {
    // No temp dir means nothing was generated = no drift
    return result;
  }

  const generatedFiles = readdirSync(TEMP_DIR).filter((f) => f.endsWith('.sql'));
  result.generatedFiles = generatedFiles;

  if (generatedFiles.length === 0) {
    // No SQL files generated = no drift
    return result;
  }

  // If we generated files, there's drift
  result.hasDrift = true;

  // Analyze the generated SQL to provide details
  for (const file of generatedFiles) {
    const content = readFileSync(join(TEMP_DIR, file), 'utf-8');
    const lines = content.split('\n').filter((l) => l.trim() && !l.startsWith('--'));

    // Extract key operations
    const operations: string[] = [];
    for (const line of lines) {
      if (line.includes('CREATE TABLE')) {
        const match = line.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?"?(\w+)"?/i);
        if (match) operations.push(`+ Table: ${match[1]}`);
      }
      if (line.includes('CREATE TYPE')) {
        const match = line.match(/CREATE TYPE\s+"?(\w+)"?/i);
        if (match) operations.push(`+ Enum: ${match[1]}`);
      }
      if (line.includes('ALTER TABLE')) {
        const match = line.match(/ALTER TABLE\s+"?(\w+)"?/i);
        if (match) operations.push(`~ Alter: ${match[1]}`);
      }
      if (line.includes('CREATE INDEX')) {
        const match = line.match(/CREATE INDEX\s+(?:IF NOT EXISTS\s+)?"?(\w+)"?/i);
        if (match) operations.push(`+ Index: ${match[1]}`);
      }
    }

    if (operations.length > 0) {
      result.driftDetails.push(`${file}:`);
      result.driftDetails.push(...operations.map((op) => `  ${op}`));
    }
  }

  return result;
}

async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    Schema Drift Check                          ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');

  // Step 1: Ensure dist exists
  console.log('1. Checking compiled schema...');
  if (!ensureDistExists()) {
    process.exit(1);
  }
  console.log('   ✓ dist/schema/index.js found');

  // Step 2: Get existing migrations
  console.log('\n2. Checking existing migrations...');
  const existingMigrations = getExistingMigrations();
  console.log(`   Found ${existingMigrations.length} migration file(s)`);
  for (const file of existingMigrations) {
    console.log(`   - ${file}`);
  }

  // Step 3: Generate to temp directory
  console.log('\n3. Running drift detection...');
  const genResult = generateToTemp();
  if (!genResult.success) {
    console.error(`   ✗ Failed to run drift check: ${genResult.error}`);
    cleanup();
    process.exit(1);
  }
  console.log('   ✓ Drift detection complete');

  // Step 4: Check results
  console.log('\n4. Analyzing results...');
  const result = checkForNewMigrations();

  // Step 5: Cleanup
  cleanup();

  // Print results
  console.log('\n' + '═'.repeat(60));
  console.log('DRIFT CHECK RESULT');
  console.log('═'.repeat(60));

  if (result.hasDrift) {
    console.log('\n❌ DRIFT DETECTED');
    console.log('\nThe TypeScript schema has changes that are not in migrations.');
    console.log('Run "bun run generate" to create a new migration.\n');

    if (result.driftDetails.length > 0) {
      console.log('Detected changes:');
      for (const detail of result.driftDetails) {
        console.log(`  ${detail}`);
      }
    }

    console.log('\n' + '═'.repeat(60));
    process.exit(1);
  } else {
    console.log('\n✅ NO DRIFT');
    console.log('\nTypeScript schema matches existing migrations.');
    console.log('Schema and migrations are in sync.\n');
    console.log('═'.repeat(60));
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  cleanup();
  process.exit(1);
});
