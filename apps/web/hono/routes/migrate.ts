import { Hono } from 'hono';
import { domains } from '@dns-ops/db/schema';
import type { Env } from '../types.js';

const migrateRoutes = new Hono<Env>();

// Check migration status - try to query domains table
migrateRoutes.get('/status', async (c) => {
  const db = c.get('db');
  if (!db) {
    return c.json({ error: 'Database not available' }, 503);
  }

  try {
    // Try to query domains table using the adapter's select method
    const result = await db.select(domains).limit(1);
    return c.json({ status: 'migrated', domainCount: 'unknown (adapter returns array)' });
  } catch (err: any) {
    // If domains table doesn't exist, this will fail
    if (err.message?.includes('does not exist') || err.message?.includes('relation')) {
      return c.json({ 
        status: 'not_migrated', 
        error: 'domains table does not exist',
        message: 'Run drizzle-kit push:pg to create tables'
      }, 200);
    }
    return c.json({ status: 'error', message: err.message }, 500);
  }
});

// Run migration - this will just verify the database is accessible
migrateRoutes.post('/run', async (c) => {
  const db = c.get('db');
  if (!db) {
    return c.json({ error: 'Database not available' }, 503);
  }

  try {
    // Just try to query - if this works, db is accessible
    await db.select(domains).limit(1);
    return c.json({ 
      status: 'db_accessible',
      message: 'Database is accessible. Full migration must be done via drizzle-kit push:pg'
    });
  } catch (err: any) {
    if (err.message?.includes('does not exist')) {
      return c.json({ 
        status: 'tables_missing',
        error: err.message,
        solution: 'Run: cd packages/db && DATABASE_URL=<url> npx drizzle-kit push:pg'
      }, 200);
    }
    return c.json({ status: 'error', message: err.message }, 500);
  }
});

export default migrateRoutes;
