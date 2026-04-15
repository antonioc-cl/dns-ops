import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { domains } from '@dns-ops/db/schema';
import type { Env } from '../types.js';

const migrateRoutes = new Hono<Env>();

// Ensure users table exists
async function ensureUsersTable(db: any) {
  try {
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
    console.log('[Migration] Users table created or already exists');
    return true;
  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      return true;
    }
    console.error('[Migration] Users table error:', error.message);
    return false;
  }
}

// Check migration status
migrateRoutes.get('/status', async (c) => {
  const db = c.get('db');
  if (!db) {
    return c.json({ error: 'Database not available' }, 503);
  }

  try {
    // Try to query domains table
    await db.select(domains);
    return c.json({ status: 'migrated', message: 'Database tables exist' });
  } catch (err: any) {
    if (err.message?.includes('does not exist') || err.message?.includes('relation')) {
      return c.json({ 
        status: 'not_migrated', 
        error: 'domains table does not exist'
      }, 200);
    }
    return c.json({ status: 'error', message: err.message }, 500);
  }
});

// Run migration check
migrateRoutes.post('/run', async (c) => {
  const db = c.get('db');
  if (!db) {
    return c.json({ error: 'Database not available' }, 503);
  }

  try {
    // Check domains table
    await db.select(domains);
    
    // Ensure users table
    await ensureUsersTable(db);
    
    return c.json({ 
      status: 'migrated',
      message: 'Database is accessible and migrated'
    });
  } catch (err: any) {
    if (err.message?.includes('does not exist')) {
      return c.json({ 
        status: 'needs_migration',
        error: err.message,
        solution: 'Run: cd packages/db && DATABASE_URL=<url> npx drizzle-kit push:pg'
      }, 200);
    }
    return c.json({ status: 'error', message: err.message }, 500);
  }
});

export default migrateRoutes;
