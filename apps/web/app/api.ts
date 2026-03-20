import { createStartAPIHandler } from '@tanstack/react-start/api';
import { getEvent } from '@tanstack/react-start/server';
import { Hono } from 'hono';
import { assertEnvValid } from '../hono/config/env.js';
import { authMiddleware, dbMiddleware } from '../hono/middleware/index.js';
import { apiRoutes } from '../hono/routes/api.js';
import type { Env } from '../hono/types.js';

// Validate environment at module load time (fail fast)
// In Workers runtime, process.env won't have all vars - they come from bindings.
// This validation primarily catches local dev misconfigurations.
if (typeof process !== 'undefined' && process.env) {
  try {
    assertEnvValid();
  } catch (error) {
    // In production Workers, this may fail due to missing process.env
    // but that's expected - the actual config comes from wrangler bindings
    if (process.env.NODE_ENV === 'development') {
      throw error;
    }
    // In production, log but don't fail - bindings provide the config
    console.warn('[ENV] Skipping env validation in Workers runtime');
  }
}

const app = new Hono<Env>();

// Global middleware - order matters
// 1. DB middleware first to ensure database is available
app.use('*', dbMiddleware);
// 2. Auth middleware to populate tenant/actor context
app.use('*', authMiddleware);

app.route('/api', apiRoutes);

export default createStartAPIHandler(({ request }) => {
  // In Cloudflare Pages (nitro preset), CF bindings live at
  // event.context.cloudflare.env. Pass as Hono env so c.env.DB is populated.
  // In local dev (vinxi), cloudflare context is absent — dbMiddleware falls back to PG.
  const event = getEvent();
  const cfEnv = (event?.context as { cloudflare?: { env?: Env['Bindings'] } })?.cloudflare?.env;
  return app.fetch(request, cfEnv ?? {});
});
