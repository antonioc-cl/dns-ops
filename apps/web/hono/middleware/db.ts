import type { IDatabaseAdapter } from '@dns-ops/db';
import { createPostgresAdapter } from '@dns-ops/db';
import { createMiddleware } from 'hono/factory';
import { getEnvConfig } from '../config/env.js';
import type { Env } from '../types.js';

let pgAdapter: IDatabaseAdapter | null = null;
let currentConnectionString: string | null = null;

function getSharedPgAdapter(connectionString: string): IDatabaseAdapter {
  if (!pgAdapter || currentConnectionString !== connectionString) {
    pgAdapter = createPostgresAdapter(connectionString);
    currentConnectionString = connectionString;
  }

  return pgAdapter;
}

export const dbMiddleware = createMiddleware<Env>(async (c, next) => {
  const { databaseUrl } = getEnvConfig(c.env);

  if (databaseUrl) {
    c.set('db', getSharedPgAdapter(databaseUrl));
  }

  await next();
});
