/**
 * Database Middleware
 *
 * Sets up database context for collector routes.
 * Creates a PostgreSQL adapter and attaches it to the Hono context.
 */

import { createPostgresAdapter } from '@dns-ops/db';
import type { MiddlewareHandler } from 'hono';
import type { Env } from '../types.js';

/**
 * Database middleware - attaches DB adapter to context
 *
 * Requires DATABASE_URL environment variable to be set.
 */
export const dbMiddleware: MiddlewareHandler<Env> = async (c, next) => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is not set');
    return c.json(
      {
        error: 'Database configuration error',
        message: 'DATABASE_URL not configured',
      },
      500
    );
  }

  try {
    const adapter = createPostgresAdapter(databaseUrl);
    c.set('db', adapter);
    await next();
  } catch (error) {
    console.error('Failed to create database adapter:', error);
    return c.json(
      {
        error: 'Database connection error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
};

/**
 * Database middleware with validation - fails on startup if misconfigured
 *
 * Use this for strict environments where DB must be available.
 */
export const dbMiddlewareStrict: MiddlewareHandler<Env> = async (c, next) => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required but not set');
  }

  const adapter = createPostgresAdapter(databaseUrl);
  c.set('db', adapter);
  await next();
};
