#!/usr/bin/env npx tsx
/**
 * Schema Drift Check
 *
 * Uses drizzle-kit's PostgreSQL check command against the compiled schema and
 * checked-in migrations. Exits non-zero when schema and migrations diverge.
 */

import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureCompiledSchemaExists } from './schema-manifest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PACKAGE_ROOT = join(__dirname, '..');
const CONFIG_PATH = join(PACKAGE_ROOT, 'drizzle.config.ts');

async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    Schema Drift Check                          ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');

  console.log('1. Checking compiled schema...');
  if (!ensureCompiledSchemaExists()) {
    console.error('❌ Error: dist/schema/index.js not found');
    console.error('   Run "bun run build" first to compile the schema');
    process.exit(1);
  }
  console.log('   ✓ dist/schema/index.js found');

  console.log('\n2. Running drizzle-kit check...');
  try {
    execSync(`npx drizzle-kit check:pg --config=${CONFIG_PATH}`, {
      cwd: PACKAGE_ROOT,
      stdio: 'inherit',
      encoding: 'utf-8',
    });
  } catch (error) {
    console.error('\n❌ DRIFT DETECTED');
    console.error('Schema and migrations are not in sync.');
    process.exit((error as { status?: number }).status ?? 1);
  }

  console.log('\n✅ NO DRIFT');
  console.log('Schema and migrations are in sync.');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
