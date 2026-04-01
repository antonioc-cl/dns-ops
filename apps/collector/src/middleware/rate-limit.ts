/**
 * Rate Limiting Middleware
 *
 * Token-bucket rate limiter for collector endpoints.
 * Limits requests per tenant to prevent abuse.
 */

import type { Context, Next } from 'hono';

// Rate limit configuration
interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
}

// Default limits from environment
const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  '/api/collect/domain': { limit: 10, windowMs: 60000 }, // 10 req/min
  '/api/collect/mail': { limit: 10, windowMs: 60000 }, // 10 req/min
  '/api/probe': { limit: 5, windowMs: 60000 }, // 5 req/min
};

// In-memory store for rate limiting (per tenant)
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Get or create a rate limit entry for a key
 * Initializes with full token bucket (limit) so new tenants can burst
 */
function getEntry(key: string, limit: number): RateLimitEntry {
  let entry = rateLimitStore.get(key);
  if (!entry) {
    entry = { tokens: limit, lastRefill: Date.now() };
    rateLimitStore.set(key, entry);
  }
  return entry;
}

/**
 * Refill tokens based on elapsed time
 */
function refillTokens(entry: RateLimitEntry, limit: number, windowMs: number): void {
  const now = Date.now();
  const elapsed = now - entry.lastRefill;
  const tokensToAdd = Math.floor((elapsed / windowMs) * limit);

  if (tokensToAdd > 0) {
    entry.tokens = Math.min(limit, entry.tokens + tokensToAdd);
    entry.lastRefill = now;
  }
}

/**
 * Attempt to consume a token
 * Returns true if request is allowed, false if rate limited
 */
function tryConsume(entry: RateLimitEntry, _limit: number): boolean {
  // Token bucket: if tokens <= 0, bucket is empty, reject
  // Tokens start at limit (full bucket), decrement on each request
  if (entry.tokens <= 0) {
    return false;
  }
  entry.tokens--;
  return true;
}

/**
 * Get Retry-After header value in seconds
 */
function getRetryAfter(windowMs: number): number {
  return Math.ceil(windowMs / 1000);
}

/**
 * Match a request path to a rate limit config
 * Returns the most specific match
 */
function matchRateLimit(path: string): RateLimitConfig | null {
  // Check exact matches first
  if (DEFAULT_LIMITS[path]) {
    return DEFAULT_LIMITS[path];
  }

  // Check prefix matches (for /api/probe/*)
  for (const [pattern, config] of Object.entries(DEFAULT_LIMITS)) {
    if (path.startsWith(pattern)) {
      return config;
    }
  }

  return null;
}

/**
 * Create rate limit key from tenant ID and path
 */
function createKey(tenantId: string | undefined, path: string): string {
  return `${tenantId || 'anonymous'}:${path}`;
}

/**
 * Rate limit middleware for Hono
 * @param scope - The scope to rate limit ('collect' or 'probes')
 */
export function rateLimitMiddleware(scope: 'collect' | 'probes') {
  return async (c: Context, next: Next) => {
    const path = new URL(c.req.url).pathname;
    const tenantId = c.get('tenantId') as string | undefined;

    // Determine config based on scope
    let config: RateLimitConfig | null = null;

    if (scope === 'collect') {
      // Check for domain or mail collection
      if (path.includes('/collect/domain')) {
        config = DEFAULT_LIMITS['/api/collect/domain'];
      } else if (path.includes('/collect/mail')) {
        config = DEFAULT_LIMITS['/api/collect/mail'];
      }
    } else if (scope === 'probes') {
      config = DEFAULT_LIMITS['/api/probe'];
    }

    if (!config) {
      // No rate limit for this path
      return next();
    }

    const key = createKey(tenantId, path);
    const entry = getEntry(key, config.limit);

    // Refill tokens based on elapsed time
    refillTokens(entry, config.limit, config.windowMs);

    // Try to consume a token
    if (!tryConsume(entry, config.limit)) {
      // Rate limited
      const retryAfter = getRetryAfter(config.windowMs);
      return c.json(
        {
          error: 'Too Many Requests',
          code: 'RATE_LIMITED',
          message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
          retryAfter,
        },
        429,
        {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(config.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(entry.lastRefill + config.windowMs),
        }
      );
    }

    // Add rate limit headers to response
    const remaining = Math.max(0, config.limit - entry.tokens);
    c.res.headers.set('X-RateLimit-Limit', String(config.limit));
    c.res.headers.set('X-RateLimit-Remaining', String(remaining));
    c.res.headers.set('X-RateLimit-Reset', String(entry.lastRefill + config.windowMs));

    return next();
  };
}

/**
 * Reset rate limit for a specific tenant (for testing)
 */
export function resetRateLimit(tenantId?: string, path?: string): void {
  if (tenantId && path) {
    const key = createKey(tenantId, path);
    rateLimitStore.delete(key);
  } else if (tenantId) {
    // Delete all entries for tenant
    for (const key of rateLimitStore.keys()) {
      if (key.startsWith(`${tenantId}:`)) {
        rateLimitStore.delete(key);
      }
    }
  } else {
    // Clear all
    rateLimitStore.clear();
  }
}

/**
 * Get current rate limit status (for testing/monitoring)
 */
export function getRateLimitStatus(
  tenantId: string,
  path: string
): {
  limit: number;
  remaining: number;
  resetMs: number;
} | null {
  const config = matchRateLimit(path);
  if (!config) {
    return null;
  }

  const key = createKey(tenantId, path);
  const entry = rateLimitStore.get(key);

  return {
    limit: config.limit,
    remaining: entry ? Math.max(0, config.limit - entry.tokens) : config.limit,
    resetMs: entry ? entry.lastRefill + config.windowMs : Date.now() + config.windowMs,
  };
}

/**
 * Check rate limit without middleware (for testing)
 * Returns { allowed: boolean, remaining: number }
 *
 * @param scope - 'collect' or 'probes' (maps to base paths)
 * @param tenantId - Optional tenant ID (if undefined, no rate limiting applies)
 * @param path - Optional custom path (defaults to scope base path)
 */
export function checkRateLimit(
  scope: 'collect' | 'probes',
  tenantId?: string,
  path?: string
): {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
} {
  // If no tenantId, skip rate limiting (passthrough)
  if (!tenantId) {
    return { allowed: true, remaining: Infinity };
  }

  // Use provided path or determine from scope
  const checkPath = path || (scope === 'probes' ? '/api/probe' : '/api/collect/domain');
  const config = matchRateLimit(checkPath);

  if (!config) {
    return { allowed: true, remaining: Infinity };
  }

  const key = createKey(tenantId, checkPath);
  const entry = getEntry(key, config.limit);

  // Refill tokens
  refillTokens(entry, config.limit, config.windowMs);

  // Try to consume a token
  if (!tryConsume(entry, config.limit)) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil(config.windowMs / 1000) };
  }

  return { allowed: true, remaining: entry.tokens };
}
