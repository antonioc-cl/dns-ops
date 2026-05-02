import { createStartAPIHandler } from '@tanstack/react-start/api';
import { getEvent } from '@tanstack/react-start/server';
import { Hono } from 'hono';
import { assertEnvValid } from '../hono/config/env.js';
import { authMiddleware, dbMiddleware } from '../hono/middleware/index.js';
import { apiRoutes } from '../hono/routes/api.js';
import type { Env } from '../hono/types.js';

// Validate environment at module load time (fail fast)
if (typeof process !== 'undefined' && process.env) {
  try {
    assertEnvValid();
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      throw error;
    }
    console.warn('[ENV] Skipping env validation in production runtime');
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
  // Railway node-server preset: env comes from process.env
  // dbMiddleware reads DATABASE_URL directly; no runtime bindings needed.
  const event = getEvent();
  const runtimeEnv = (event?.context as Record<string, unknown>) ?? {};
  return app.fetch(request, runtimeEnv);
});
