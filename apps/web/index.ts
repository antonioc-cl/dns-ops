import { fetchRequestHandler } from '@tanstack/react-start/server';
import { createServerClient } from '@tanstack/react-start/server-client';
import { createWalRouter } from '@tanstack/wals';
import { getRouterManifest } from '@tanstack/react-start/entry-server';
import { createAPIHandler } from '@tanstack/react-start/api';

import app from './app/App';
import apiHandler from './app/api';
import { createServerClient } from './app/client';
import type { APIHandler } from './app/types';
import { getDb } from '@dns-ops/db';

// Initialize database migrations on startup
async function runMigrations() {
  try {
    console.log('[Migration] Starting database migrations...');
    
    const db = await getDb();
    if (!db) {
      console.error('[Migration] Database not available');
      return;
    }
    
    // Create users table if it doesn't exist
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
    console.log('[Migration] Database migrations complete');
  } catch (err: any) {
    // Ignore "already exists" errors
    if (err.message?.includes('already exists')) {
      console.log('[Migration] Users table already exists');
      return;
    }
    console.error('[Migration] Error:', err.message);
  }
}

// Import sql from drizzle-orm
import { sql } from 'drizzle-orm';

// Run migrations (fire and forget)
runMigrations().catch(console.error);

const handler = createAPIHandler({
  apiHandler: apiHandler as unknown as APIHandler,
  createServerClient,
  fetchRequestHandler,
  getRouterManifest,
  router: app.router,
  createWalRouter,
});

export { handler };
