/**
 * Authorization Middleware
 *
 * Route-level authorization for sensitive operations.
 * Ensures only authenticated users can access or mutate operational data.
 */

import { createMiddleware } from 'hono/factory';
import type { Env } from '../types.js';

/**
 * Require authentication middleware
 * Rejects requests without valid tenantId and actorId
 */
export const requireAuth = createMiddleware<Env>(async (c, next) => {
  const tenantId = c.get('tenantId');
  const actorId = c.get('actorId');

  if (!tenantId) {
    return c.json(
      {
        error: 'Unauthorized',
        message: 'Tenant context required. Authentication may have failed or was not provided.',
      },
      401
    );
  }

  if (!actorId) {
    return c.json(
      {
        error: 'Unauthorized',
        message: 'Actor context required. Authentication may have failed or was not provided.',
      },
      401
    );
  }

  return next();
});

/**
 * Require write permission middleware
 * For mutating operations - ensures actor is not 'unknown' or 'system'
 */
export const requireWritePermission = createMiddleware<Env>(async (c, next) => {
  const tenantId = c.get('tenantId');
  const actorId = c.get('actorId');

  if (!tenantId) {
    return c.json(
      {
        error: 'Unauthorized',
        message: 'Tenant context required for write operations.',
      },
      401
    );
  }

  if (!actorId || actorId === 'unknown' || actorId === 'system') {
    return c.json(
      {
        error: 'Forbidden',
        message: 'Valid actor identity required for write operations.',
      },
      403
    );
  }

  return next();
});

/**
 * Require admin/internal access
 * For sensitive operations like shadow adjudication and template management
 */
export const requireAdminAccess = createMiddleware<Env>(async (c, next) => {
  const tenantId = c.get('tenantId');
  const actorId = c.get('actorId');
  const actorEmail = c.get('actorEmail');

  if (!tenantId || !actorId) {
    return c.json(
      {
        error: 'Unauthorized',
        message: 'Authentication required for admin operations.',
      },
      401
    );
  }

  // Check for internal service access
  const internalSecret = c.req.header('X-Internal-Secret');
  const expectedSecret = process.env.INTERNAL_SECRET;
  if (expectedSecret && internalSecret === expectedSecret) {
    return next();
  }

  // Check for Cloudflare Access OR actorEmail (either indicates internal user)
  const cfEmail = c.req.header('CF-Access-Authenticated-User-Email');
  if (cfEmail || actorEmail) {
    return next();
  }

  // In development, allow dev access
  if (process.env.NODE_ENV === 'development' && c.req.header('X-Dev-Actor')) {
    return next();
  }

  // In test mode, allow admin bypass via X-Test-Admin header
  if (process.env.NODE_ENV === 'test' && c.req.header('X-Test-Admin') === 'true') {
    return next();
  }

  return c.json(
    {
      error: 'Forbidden',
      message: 'Admin access required for this operation.',
    },
    403
  );
});

/**
 * Tenant isolation middleware
 * Ensures users can only access data within their tenant scope
 * This is a guardrail - actual filtering should happen at the repository level
 */
export const enforceTenantIsolation = createMiddleware<Env>(async (c, next) => {
  const tenantId = c.get('tenantId');

  if (!tenantId) {
    return c.json(
      {
        error: 'Unauthorized',
        message: 'Tenant context required.',
      },
      401
    );
  }

  // Store tenantId in request context for downstream use
  // This ensures all database queries can filter by tenant
  c.set('tenantId', tenantId);

  return next();
});
