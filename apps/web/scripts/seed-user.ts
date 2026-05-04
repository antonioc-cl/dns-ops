#!/usr/bin/env bun
/**
 * Seed a user into the production database.
 *
 * Usage:
 *   DATABASE_URL=<url> bun run scripts/seed-user.ts
 */

import { hash } from '@node-rs/argon2';
import { createPostgresAdapter } from '@dns-ops/db';
import { getTenantUUID } from '@dns-ops/contracts';
import { users } from '@dns-ops/db/schema';
import { eq } from 'drizzle-orm';

const EMAIL = 'antonio.correa@gmail.com';
const NAME = 'Antonio Correa';

function generatePassword(length = 24): string {
  const charset =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => charset[b % charset.length]).join('');
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is required');
    process.exit(1);
  }

  // Generate secure password
  const password = generatePassword();

  // Hash with argon2 (same settings as login verification)
  const passwordHash = await hash(password);

  // Connect to DB using the project's postgres adapter
  const db = createPostgresAdapter(databaseUrl);

  // Generate tenant UUID from email domain
  const tenantName = EMAIL.split('@')[1];
  const tenantId = await getTenantUUID(tenantName);

  // Check if user already exists
  const existing = await db.getDrizzle().query.users.findFirst({
    where: eq(users.email, EMAIL),
  });

  if (existing) {
    console.log('⚠️  User already exists:', EMAIL);
    console.log('   To reset password, delete the user first or use a migration.');
    return;
  }

  // Insert user
  await db.getDrizzle().insert(users).values({
    email: EMAIL,
    passwordHash,
    name: NAME,
    tenantId,
  });

  console.log('✅ User created successfully');
  console.log('   Email:', EMAIL);
  console.log('   Password:', password);
  console.log('   Tenant:', tenantName);
  console.log('   Tenant ID:', tenantId);
  console.log('');
  console.log('🔐 Save this password — it will not be shown again.');
}

main().catch((err) => {
  console.error('❌ Failed to seed user:', err);
  process.exit(1);
});
