import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import type { Env } from '../types.js';

const migrateRoutes = new Hono<Env>();

// Run database migrations
migrateRoutes.post('/run', async (c) => {
  const db = c.get('db');
  if (!db) {
    return c.json({ error: 'Database not available' }, 503);
  }

  const results: string[] = [];
  
  try {
    // Check if domains table exists
    await db.execute(sql`SELECT 1 FROM domains LIMIT 1`);
    return c.json({ status: 'already_migrated', message: 'Database already set up' });
  } catch {
    results.push('domains table not found, will create...');
  }

  // Run basic table creation using raw SQL
  // This is a simplified migration - full migration should be done via drizzle-kit
  try {
    // Create domains table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS domains (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL UNIQUE,
        tenant_id UUID NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    results.push('Created domains table');
  } catch (err: any) {
    results.push('domains: ' + (err.message || 'error'));
  }

  return c.json({ status: 'partial', results, message: 'Migration attempted' });
});

export default migrateRoutes;
