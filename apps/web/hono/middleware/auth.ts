/**
 * Auth Middleware
 *
 * Authentication for internal use with cookie-based sessions.
 */

import { getTenantUUID } from '@dns-ops/contracts';
import { createMiddleware } from 'hono/factory';
import type { Env } from '../types.js';

function getRuntimeSecret(
  c: Parameters<typeof createMiddleware<Env>>[0],
  name: 'INTERNAL_SECRET' | 'API_KEY_SECRET'
): string | undefined {
  const bindingValue = c.env?.[name];
  return typeof bindingValue === 'string' ? bindingValue : process.env[name];
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  
  const result: Record<string, string> = {};
  const parts = cookieHeader.split(';');
  
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    
    if (key) {
      result[key] = value;
    }
  }
  
  return result;
}

function isValidIdentifier(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const simpleRegex = /^[a-zA-Z0-9_.-]{1,64}$/;
  return uuidRegex.test(id) || simpleRegex.test(id);
}

/**
 * Extract auth from session cookie
 * Format: dns_ops_session=<email>:<tenant>
 */
function extractCookieSession(c: Parameters<typeof createMiddleware<Env>>[0]): { tenantId: string; actorId: string; actorEmail?: string } | null {
  const cookies = parseCookies(c.req.header('Cookie'));
  const session = cookies['dns_ops_session'];
  
  if (!session) return null;
  
  // Cookie value is URL encoded
  const decodedSession = decodeURIComponent(session);
  
  // Format: email:tenantDomain
  const colonIndex = decodedSession.indexOf(':');
  if (colonIndex === -1) return null;
  
  const email = decodedSession.slice(0, colonIndex);
  const tenantDomain = decodedSession.slice(colonIndex + 1);
  
  if (!email || !tenantDomain) return null;
  if (!isValidIdentifier(tenantDomain)) return null;
  
  return {
    tenantId: tenantDomain,
    actorId: email,
    actorEmail: email,
  };
}

/**
 * Extract auth from API key header
 */
function extractApiKey(c: Parameters<typeof createMiddleware<Env>>[0]): { tenantId: string; actorId: string } | null {
  const apiKey = c.req.header('X-API-Key');
  if (!apiKey) return null;

  const parts = apiKey.split(':');
  if (parts.length < 3) return null;

  const [tenantId, actorId, secret] = parts;
  const expectedSecret = getRuntimeSecret(c, 'API_KEY_SECRET');

  if (!expectedSecret || secret !== expectedSecret) return null;
  if (!tenantId || !actorId) return null;
  if (!isValidIdentifier(tenantId) || !isValidIdentifier(actorId)) return null;

  return { tenantId, actorId };
}

/**
 * Dev bypass for local development
 */
function extractDevBypass(c: Parameters<typeof createMiddleware<Env>>[0]): { tenantId: string; actorId: string } | null {
  if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'development') return null;
  
  const tenantId = c.req.header('X-Dev-Tenant');
  const actorId = c.req.header('X-Dev-Actor');
  
  if (!tenantId || !actorId) return null;
  if (!isValidIdentifier(tenantId) || !isValidIdentifier(actorId)) return null;
  
  return { tenantId, actorId };
}

/**
 * Auth middleware - populates auth context
 */
export const authMiddleware = createMiddleware<Env>(async (c, next) => {
  // Priority: cookie session > API key > dev bypass
  const authContext = extractCookieSession(c) || extractApiKey(c) || extractDevBypass(c);

  if (authContext) {
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
 * Require auth middleware - rejects requests without authentication
 */
export const requireAuthMiddleware = createMiddleware<Env>(async (c, next) => {
  const authContext = extractCookieSession(c) || extractApiKey(c) || extractDevBypass(c);

  if (!authContext) {
    return c.json({ error: 'Unauthorized', message: 'Authentication required.' }, 401);
  }

  const tenantUUID = await getTenantUUID(authContext.tenantId);
  c.set('tenantId', tenantUUID);
  c.set('actorId', authContext.actorId);
  if (authContext.actorEmail) {
    c.set('actorEmail', authContext.actorEmail);
  }

  return next();
});

/**
 * Internal only middleware
 */
export const internalOnlyMiddleware = createMiddleware<Env>(async (c, next) => {
  const internalSecret = c.req.header('X-Internal-Secret');
  const expectedSecret = getRuntimeSecret(c, 'INTERNAL_SECRET');

  if (expectedSecret && internalSecret === expectedSecret) {
    const systemTenantUUID = await getTenantUUID('system');
    c.set('tenantId', systemTenantUUID);
    c.set('actorId', 'internal-service');
    await next();
    return;
  }

  return c.json({ error: 'Forbidden', message: 'Internal access only.' }, 403);
});
