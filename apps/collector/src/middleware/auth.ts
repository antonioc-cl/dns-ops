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
 *
 * Note: tenantId is normalized to UUID format for database compatibility.
 */

import { getTenantUUID } from '@dns-ops/contracts';
import { createMiddleware } from 'hono/factory';
import type { Env } from '../types.js';
import { getCollectorLogger } from './error-tracking.js';

const logger = getCollectorLogger();

/**
 * Auth context from verified identity
 */
interface AuthContext {
  tenantId: string;
  actorId: string;
  isInternal?: boolean;
}

function getRuntimeSecret(name: 'INTERNAL_SECRET' | 'API_KEY_SECRET'): string | undefined {
  return process.env[name];
}

/**
 * Extract auth from internal secret header
 *
 * For secure web → collector communication.
 * Requires INTERNAL_SECRET env var to be set.
 */
function extractInternalSecret(
  c: Parameters<Parameters<typeof createMiddleware<Env>>[0]>[0]
): AuthContext | null {
  const internalSecret = c.req.header('X-Internal-Secret');
  const expectedSecret = getRuntimeSecret('INTERNAL_SECRET');

  if (!expectedSecret || !internalSecret) {
    return null;
  }

  if (internalSecret !== expectedSecret) {
    logger.warn('Invalid internal secret attempt', { method: c.req.method, path: c.req.path });
    return null;
  }

  const tenantId = c.req.header('X-Tenant-Id');
  const actorId = c.req.header('X-Actor-Id');

  if (!tenantId || !actorId) {
    logger.warn('Missing tenant or actor headers on internal request', {
      method: c.req.method,
      path: c.req.path,
    });
    return null;
  }

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
function extractApiKey(
  c: Parameters<Parameters<typeof createMiddleware<Env>>[0]>[0]
): AuthContext | null {
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

  const expectedSecret = getRuntimeSecret('API_KEY_SECRET');
  const isProduction = process.env.NODE_ENV === 'production';

  if (!expectedSecret) {
    if (isProduction) {
      logger.warn('Rejected API key auth because API_KEY_SECRET is not configured', {
        tenantId,
        method: c.req.method,
        path: c.req.path,
      });
      return null;
    }
  } else if (secret !== expectedSecret) {
    logger.warn('Invalid API key attempt', { tenantId, method: c.req.method, path: c.req.path });
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
function extractDevBypass(
  c: Parameters<Parameters<typeof createMiddleware<Env>>[0]>[0]
): AuthContext | null {
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
 *
 * Note: tenantId is normalized to UUID format for database compatibility.
 */
export const serviceAuthMiddleware = createMiddleware<Env>(async (c, next) => {
  const authContext = extractInternalSecret(c) || extractApiKey(c) || extractDevBypass(c);

  if (authContext) {
    // Normalize tenantId to UUID format for database compatibility
    const tenantUUID = await getTenantUUID(authContext.tenantId);
    c.set('tenantId', tenantUUID);
    c.set('actorId', authContext.actorId);
  }

  return next();
});

/**
 * Require service auth middleware - rejects requests without valid authentication
 *
 * Note: tenantId is normalized to UUID format for database compatibility.
 */
export const requireServiceAuthMiddleware = createMiddleware<Env>(async (c, next) => {
  const authContext = extractInternalSecret(c) || extractApiKey(c) || extractDevBypass(c);

  if (!authContext) {
    return c.json(
      {
        error: 'Unauthorized',
        message: 'Authentication required. Provide X-Internal-Secret, X-API-Key, or dev headers.',
      },
      401
    );
  }

  // Normalize tenantId to UUID format for database compatibility
  const tenantUUID = await getTenantUUID(authContext.tenantId);
  c.set('tenantId', tenantUUID);
  c.set('actorId', authContext.actorId);

  return next();
});

/**
 * Internal only middleware - for routes that should only be accessible
 * from internal services (web app)
 *
 * Note: tenantId is normalized to UUID format for database compatibility.
 */
export const internalOnlyMiddleware = createMiddleware<Env>(async (c, next) => {
  // Check for internal secret first
  const internalAuth = extractInternalSecret(c);
  if (internalAuth?.isInternal) {
    // Normalize tenantId to UUID format
    const tenantUUID = await getTenantUUID(internalAuth.tenantId);
    c.set('tenantId', tenantUUID);
    c.set('actorId', internalAuth.actorId);
    return next();
  }

  // Check for dev bypass in development
  const devAuth = extractDevBypass(c);
  if (devAuth?.isInternal) {
    // Normalize tenantId to UUID format
    const tenantUUID = await getTenantUUID(devAuth.tenantId);
    c.set('tenantId', tenantUUID);
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
