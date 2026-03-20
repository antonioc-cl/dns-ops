#!/usr/bin/env bun
/**
 * Seed Ruleset Version
 *
 * Creates or updates the initial ruleset version in the database.
 * Run this script after migrations to ensure a ruleset version exists.
 *
 * Usage:
 *   bun run packages/db/scripts/seed-ruleset.ts
 *
 * Requires:
 *   DATABASE_URL environment variable
 */

import { createPostgresAdapter, RulesetVersionRepository } from '../src/index.js';

const CURRENT_RULESET_VERSION = '1.0.0';

async function seedRuleset(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  console.log('🌱 Seeding ruleset version...');

  try {
    const db = createPostgresAdapter(databaseUrl);
    const repo = new RulesetVersionRepository(db);

    // Check if version already exists
    const existing = await repo.findByVersion(CURRENT_RULESET_VERSION);

    if (existing) {
      console.log(`✅ Ruleset version ${CURRENT_RULESET_VERSION} already exists (ID: ${existing.id})`);
      console.log(`   Active: ${existing.active}`);
      return;
    }

    // Create new version
    const created = await repo.create({
      version: CURRENT_RULESET_VERSION,
      rulesDefinition: {
        // The actual rules are defined in @dns-ops/rules
        // This is metadata about the version
        description: 'Initial ruleset version',
        ruleCount: 10, // Approximate
        categories: ['dns', 'mail', 'delegation'],
      },
      active: true,
    });

    console.log(`✅ Created ruleset version ${created.version} (ID: ${created.id})`);
    console.log(`   Active: ${created.active}`);
  } catch (error) {
    console.error('❌ Failed to seed ruleset:', error);
    process.exit(1);
  }
}

// Run if executed directly
seedRuleset().catch(console.error);
