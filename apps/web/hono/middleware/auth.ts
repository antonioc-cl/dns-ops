/**
 * Auth Middleware
 *
 * Authentication and authorization middleware for the web API.
 * Populates tenantId, actorId, and actorEmail from request context.
 *
 * For phase 1 (internal/controlled access), this uses:
 * - Cloudflare Access JWT (if deployed behind Cloudflare Access)
 * - API key header (for service-to-service)
 * - Development bypass (for local development only)
 *
 * Note: tenantId is normalized to UUID format for database compatibility.
 */

import { getTenantUUID } from '@dns-ops/contracts';
import { createMiddleware } from 'hono/factory';
import type { Env } from '../types.js';

/**
 * Auth context from verified identity
 */
interface AuthContext {
  tenantId: string;
  actorId: string;
  actorEmail?: string;
}

/**
 * Extract auth from Cloudflare Access JWT
 *
 * In production with Cloudflare Access, the JWT is verified by Cloudflare
 * and passed as CF-Access-Authenticated-User-Email header.
 */
function extractCloudflareAccess(
  c: Parameters<Parameters<typeof createMiddleware<Env>>[0]>[0]
): AuthContext | null {
  const email = c.req.header('CF-Access-Authenticated-User-Email');
  const subject = c.req.header('CF-Access-Authenticated-User-Id');

  if (!email && !subject) {
    return null;
  }

  // Require full email format (user@domain) for tenant identification
  const emailMatch = email?.match(/^(.+)@(.+)$/);
  if (!emailMatch) {
    return null;
  }

  const emailDomain = emailMatch[2];

  // Require subject for actor identification
  if (!subject) {
    return null;
  }

  return {
    tenantId: emailDomain,
    actorId: subject,
    actorEmail: email,
  };
}

/**
 * Extract auth from API key header
 *
 * For service-to-service authentication.
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
  // In production, this should validate against a secrets store
  const parts = apiKey.split(':');
  if (parts.length < 3) {
    return null;
  }

  const [tenantId, actorId, _secret] = parts;

  // Validate tenantId and actorId are present and valid
  if (!tenantId || !actorId) {
    return null;
  }

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
 *
 * Uses X-Dev-Tenant and X-Dev-Actor headers.
 * Requires NODE_ENV=development.
 */
function extractDevBypass(
  c: Parameters<Parameters<typeof createMiddleware<Env>>[0]>[0]
): AuthContext | null {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const tenantId = c.req.header('X-Dev-Tenant');
  const actorId = c.req.header('X-Dev-Actor');

  // Both headers must to be present
  if (!tenantId || !actorId) {
    return null;
  }

  // Validate format
  if (!isValidIdentifier(tenantId) || !isValidIdentifier(actorId)) {
    return null;
  }

  return {
    tenantId,
    actorId,
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
 * Auth middleware - populates auth context from various sources
 *
 * Priority:
 * 1. Cloudflare Access JWT (production)
 * 2. API Key (service-to-service)
 * 3. Dev bypass (development only)
 *
 * If no auth is found, the request continues but tenantId/actorId will be undefined.
 * Protected routes should check for these and reject if missing.
 *
 * Note: tenantId is normalized to UUID format for database compatibility.
 */
export const authMiddleware = createMiddleware<Env>(async (c, next) => {
  // Try each auth method in priority order
  const authContext = extractCloudflareAccess(c) || extractApiKey(c) || extractDevBypass(c);

  if (authContext) {
    // Normalize tenantId to UUID format for database compatibility
    const tenantUUID = await getTenantUUID(authContext.tenantId);
    c.set('tenantId', tenantUUID);
    c.set('actorId', authContext.actorId);
    if (authContext.actorEmail) {
      c.set('actorEmail', authContext.actorEmail);
    }
  }

  return next();
});

/**
 * Require auth middleware - rejects requests without valid authentication
 *
 * Note: tenantId is normalized to UUID format for database compatibility.
 */
export const requireAuthMiddleware = createMiddleware<Env>(async (c, next) => {
  // Try each auth method in priority order
  const authContext = extractCloudflareAccess(c) || extractApiKey(c) || extractDevBypass(c);

  if (!authContext) {
    return c.json(
      {
        error: 'Unauthorized',
        message: 'Authentication required. Provide CF-Access headers, X-API-Key, or dev headers.',
      },
      401
    );
  }

  // Normalize tenantId to UUID format for database compatibility
  const tenantUUID = await getTenantUUID(authContext.tenantId);
  c.set('tenantId', tenantUUID);
  c.set('actorId', authContext.actorId);
  if (authContext.actorEmail) {
    c.set('actorEmail', authContext.actorEmail);
  }

  return next();
});

/**
 * Internal only middleware - for routes that should only be accessible
 * from internal services or specific IP ranges
 *
 * Note: tenantId is normalized to UUID format for database compatibility.
 */
export const internalOnlyMiddleware = createMiddleware<Env>(async (c, next) => {
  // Check for internal service header
  const internalSecret = c.req.header('X-Internal-Secret');
  const expectedSecret = process.env.INTERNAL_SECRET;

  if (expectedSecret && internalSecret === expectedSecret) {
    // Internal service auth - use system tenant (normalized to UUID)
    const systemTenantUUID = await getTenantUUID('system');
    c.set('tenantId', systemTenantUUID);
    c.set('actorId', 'internal-service');
    await next();
    return;
  }

  // Check for Cloudflare Access (internal users)
  const cfAuth = extractCloudflareAccess(c);
  if (cfAuth) {
    // Normalize tenantId to UUID format
    const tenantUUID = await getTenantUUID(cfAuth.tenantId);
    c.set('tenantId', tenantUUID);
    c.set('actorId', cfAuth.actorId);
    if (cfAuth.actorEmail) {
      c.set('actorEmail', cfAuth.actorEmail);
    }
    await next();
    return;
  }

  return c.json(
    {
      error: 'Forbidden',
      message: 'This endpoint is only accessible from internal services or authorized users.',
    },
    403
  );
});
