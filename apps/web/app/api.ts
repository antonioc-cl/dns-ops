import { createStartAPIHandler } from '@tanstack/react-start/api';
import { getEvent } from '@tanstack/react-start/server';
import { Hono } from 'hono';
import { dbMiddleware } from '../hono/middleware/db.js';
import { apiRoutes } from '../hono/routes/api.js';
import type { Env } from '../hono/types.js';

const app = new Hono<Env>();
app.use('*', dbMiddleware);
app.route('/api', apiRoutes);

export default createStartAPIHandler(({ request }) => {
  // In Cloudflare Pages (nitro preset), CF bindings live at
  // event.context.cloudflare.env. Pass as Hono env so c.env.DB is populated.
  // In local dev (vinxi), cloudflare context is absent — dbMiddleware falls back to PG.
  const event = getEvent();
  const cfEnv = (event?.context as { cloudflare?: { env?: Env['Bindings'] } })?.cloudflare?.env;
  return app.fetch(request, cfEnv ?? {});
});
