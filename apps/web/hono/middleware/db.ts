import { createD1Adapter, createPostgresAdapter } from '@dns-ops/db';
import { createMiddleware } from 'hono/factory';
import type { IDatabaseAdapter } from '@dns-ops/db';
import type { Env } from '../types.js';

// PostgreSQL singleton — created once per process lifecycle.
let _pgAdapter: IDatabaseAdapter | null = null;

function getLocalPgAdapter(): IDatabaseAdapter | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!_pgAdapter) {
    _pgAdapter = createPostgresAdapter(url);
  }
  return _pgAdapter;
}

export const dbMiddleware = createMiddleware<Env>(async (c, next) => {
  if (c.env?.DB) {
    // Production: Cloudflare D1 (lightweight wrapper, created per-request)
    c.set('db', createD1Adapter(c.env.DB));
  } else {
    // Local dev: PostgreSQL via DATABASE_URL (or nil — non-DB routes still work)
    const pg = getLocalPgAdapter();
    if (pg) c.set('db', pg);
  }
  await next();
});
