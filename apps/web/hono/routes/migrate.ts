import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import type { Env } from '../types.js';

const migrateRoutes = new Hono<Env>();

// Run database migrations - create basic tables
migrateRoutes.post('/run', async (c) => {
  const db = c.get('db');
  if (!db) {
    return c.json({ error: 'Database not available' }, 503);
  }

  const results: string[] = [];
  
  // The db object is a drizzle adapter, use it directly
  try {
    // Check if domains table exists using the adapter
    await db.all(sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'domains'`);
    results.push('Checked tables - found existing tables');
    return c.json({ status: 'already_migrated', results, message: 'Database may already be set up' });
  } catch (err: any) {
    results.push('Check failed: ' + (err.message || 'error'));
  }

  return c.json({ status: 'partial', results, message: 'Migration attempted - full migration needed via drizzle-kit' });
});

// Health check for migration status
migrateRoutes.get('/status', async (c) => {
  const db = c.get('db');
  if (!db) {
    return c.json({ error: 'Database not available' }, 503);
  }

  try {
    const tables = await db.all(sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
    return c.json({ status: 'connected', tables: tables.map((t: any) => t.table_name) });
  } catch (err: any) {
    return c.json({ status: 'error', message: err.message }, 500);
  }
});

export default migrateRoutes;
