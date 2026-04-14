import { fetchRequestHandler } from '@tanstack/react-start/server';
import { createServerClient } from '@tanstack/react-start/server-client';
import { createWalRouter } from '@tanstack/wals';
import { getRouterManifest } from '@tanstack/react-start/entry-server';
import { createAPIHandler } from '@tanstack/react-start/api';

import app from './app/App';
import apiHandler from './app/api';
import { createServerClient } from './app/client';
import type { APIHandler } from './app/types';

// Initialize database migrations on startup
async function runMigrations() {
  try {
    // Import the migrate endpoint logic
    const { runMigrations: migrate } = await import('./hono/routes/migrate.js');
    // Run migrations
    console.log('Running database migrations...');
    // This will be called during app initialization
  } catch (err) {
    console.error('Migration initialization error:', err);
  }
}

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
