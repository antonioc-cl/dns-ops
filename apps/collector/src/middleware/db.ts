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
 * Returns 500 error if database is not configured or connection fails.
 */
export const dbMiddleware: MiddlewareHandler<Env> = async (c, next) => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is not set');
    const response = c.json(
      {
        error: 'Database configuration error',
        message: 'DATABASE_URL not configured',
      },
      500
    );
    return response;
  }

  try {
    const adapter = createPostgresAdapter(databaseUrl);
    c.set('db', adapter);
  } catch (error) {
    console.error('Failed to create database adapter:', error);
    const response = c.json(
      {
        error: 'Database connection error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
    return response;
  }

  await next();
};

/**
 * Database middleware with validation - fails on startup if misconfigured
 *
 * Use this for strict environments where DB must be available.
 * Throws error instead of returning JSON response.
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
