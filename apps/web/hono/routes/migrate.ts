import { Hono } from 'hono';
import { domains } from '@dns-ops/db/schema';
import type { Env } from '../types.js';

const migrateRoutes = new Hono<Env>();

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
    await db.select(domains);
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
