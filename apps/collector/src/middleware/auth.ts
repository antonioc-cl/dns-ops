/**
 * Service Auth Middleware
 *
 * Authentication middleware for the collector service.
 * Protects collector routes from arbitrary access.
 *
 * Authentication methods:
 * 1. Internal secret header (for web → collector calls)
 * 2. API key header (for external service access)
 * 3. Dev bypass (development only)
 */

import { createMiddleware } from 'hono/factory';
import type { Env } from '../types.js';

/**
 * Auth context from verified identity
 */
interface AuthContext {
  tenantId: string;
  actorId: string;
  isInternal?: boolean;
}

/**
 * Extract auth from internal secret header
 *
 * For secure web → collector communication.
 * Requires INTERNAL_SECRET env var to be set.
 */
function extractInternalSecret(c: Parameters<Parameters<typeof createMiddleware<Env>>[0]>[0]): AuthContext | null {
  const internalSecret = c.req.header('X-Internal-Secret');
  const expectedSecret = process.env.INTERNAL_SECRET;

  if (!expectedSecret || !internalSecret) {
    return null;
  }

  if (internalSecret !== expectedSecret) {
    console.warn('Invalid internal secret attempt');
    return null;
  }

  // Extract tenant/actor from forwarded headers
  const tenantId = c.req.header('X-Tenant-Id') || 'system';
  const actorId = c.req.header('X-Actor-Id') || 'internal-service';

  return {
    tenantId,
    actorId,
    isInternal: true,
  };
}

/**
 * Extract auth from API key header
 *
 * Format: X-API-Key: tenantId:actorId:secret
 */
function extractApiKey(c: Parameters<Parameters<typeof createMiddleware<Env>>[0]>[0]): AuthContext | null {
  const apiKey = c.req.header('X-API-Key');

  if (!apiKey) {
    return null;
  }

  // Simple format: tenantId:actorId:secret
  const parts = apiKey.split(':');
  if (parts.length < 3) {
    return null;
  }

  const [tenantId, actorId, secret] = parts;

  // Validate against expected secret
  const expectedSecret = process.env.API_KEY_SECRET;
  if (expectedSecret && secret !== expectedSecret) {
    console.warn('Invalid API key attempt');
    return null;
  }

  // Validate tenantId and actorId format
  if (!isValidIdentifier(tenantId) || !isValidIdentifier(actorId)) {
    return null;
  }

  return {
    tenantId,
    actorId,
  };
}

/**
 * Development bypass - only for local development
 */
function extractDevBypass(c: Parameters<Parameters<typeof createMiddleware<Env>>[0]>[0]): AuthContext | null {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const tenantId = c.req.header('X-Dev-Tenant');
  const actorId = c.req.header('X-Dev-Actor');

  if (!tenantId || !actorId) {
    return null;
  }

  return {
    tenantId,
    actorId,
    isInternal: true,
  };
}

/**
 * Validate identifier format
 */
function isValidIdentifier(id: string): boolean {
  // Allow UUIDs or alphanumeric with hyphens/underscores
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const simpleRegex = /^[a-zA-Z0-9_-]{1,64}$/;

  return uuidRegex.test(id) || simpleRegex.test(id);
}

/**
 * Service auth middleware - populates auth context from various sources
 *
 * Priority:
 * 1. Internal secret (web → collector)
 * 2. API key (external services)
 * 3. Dev bypass (development only)
 */
export const serviceAuthMiddleware = createMiddleware<Env>(async (c, next) => {
  const authContext =
    extractInternalSecret(c) ||
    extractApiKey(c) ||
    extractDevBypass(c);

  if (authContext) {
    c.set('tenantId', authContext.tenantId);
    c.set('actorId', authContext.actorId);
  }

  return next();
});

/**
 * Require service auth middleware - rejects requests without valid authentication
 */
export const requireServiceAuthMiddleware = createMiddleware<Env>(async (c, next) => {
  const authContext =
    extractInternalSecret(c) ||
    extractApiKey(c) ||
    extractDevBypass(c);

  if (!authContext) {
    return c.json(
      {
        error: 'Unauthorized',
        message:
          'Authentication required. Provide X-Internal-Secret, X-API-Key, or dev headers.',
      },
      401
    );
  }

  c.set('tenantId', authContext.tenantId);
  c.set('actorId', authContext.actorId);

  return next();
});

/**
 * Internal only middleware - for routes that should only be accessible
 * from internal services (web app)
 */
export const internalOnlyMiddleware = createMiddleware<Env>(async (c, next) => {
  // Check for internal secret first
  const internalAuth = extractInternalSecret(c);
  if (internalAuth?.isInternal) {
    c.set('tenantId', internalAuth.tenantId);
    c.set('actorId', internalAuth.actorId);
    return next();
  }

  // Check for dev bypass in development
  const devAuth = extractDevBypass(c);
  if (devAuth?.isInternal) {
    c.set('tenantId', devAuth.tenantId);
    c.set('actorId', devAuth.actorId);
    return next();
  }

  return c.json(
    {
      error: 'Forbidden',
      message: 'This endpoint is only accessible from internal services.',
    },
    403
  );
});
