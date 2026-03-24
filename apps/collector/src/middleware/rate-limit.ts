/**
 * Rate Limiting Middleware
 *
 * In-memory token-bucket rate limiter for the collector.
 * Limits requests per tenant to prevent abuse.
 */

interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

export const RATE_LIMITS = {
  collect: { limit: 10, windowMs: 60_000 },
  probes: { limit: 5, windowMs: 60_000 },
} as const;

type RateLimitKey = keyof typeof RATE_LIMITS;

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

class RateLimiter {
  private buckets = new Map<string, TokenBucket>();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  check(tenantId: string): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(tenantId);

    if (!bucket) {
      this.buckets.set(tenantId, { tokens: this.config.limit - 1, lastRefill: now });
      return true;
    }

    const elapsed = now - bucket.lastRefill;
    const refillAmount = Math.floor((elapsed / this.config.windowMs) * this.config.limit);

    if (refillAmount > 0) {
      bucket.tokens = Math.min(this.config.limit, bucket.tokens + refillAmount);
      bucket.lastRefill = now;
    }

    if (bucket.tokens > 0) {
      bucket.tokens--;
      return true;
    }

    return false;
  }

  getRemaining(tenantId: string): number {
    const now = Date.now();
    const bucket = this.buckets.get(tenantId);

    if (!bucket) {
      return this.config.limit;
    }

    const elapsed = now - bucket.lastRefill;
    const refillAmount = Math.floor((elapsed / this.config.windowMs) * this.config.limit);
    return Math.min(this.config.limit, bucket.tokens + refillAmount);
  }

  getRetryAfter(tenantId: string): number {
    const bucket = this.buckets.get(tenantId);
    if (!bucket || bucket.tokens > 0) {
      return 0;
    }

    const now = Date.now();
    const elapsed = now - bucket.lastRefill;
    return Math.max(0, this.config.windowMs - elapsed);
  }
}

const collectors = new Map<RateLimitKey, RateLimiter>();

export function getRateLimiter(type: RateLimitKey): RateLimiter {
  if (!collectors.has(type)) {
    collectors.set(type, new RateLimiter(RATE_LIMITS[type]));
  }
  return collectors.get(type) as RateLimiter;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number;
  limit: number;
  remaining: number;
}

export function checkRateLimit(type: RateLimitKey, tenantId: string | undefined): RateLimitResult {
  const config = RATE_LIMITS[type];

  if (!tenantId) {
    return { allowed: true, retryAfter: 0, limit: config.limit, remaining: config.limit };
  }

  const limiter = getRateLimiter(type);
  const allowed = limiter.check(tenantId);
  const remaining = limiter.getRemaining(tenantId);
  const retryAfter = allowed ? 0 : Math.ceil(limiter.getRetryAfter(tenantId) / 1000);

  return { allowed, retryAfter, limit: config.limit, remaining };
}

export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const reset = Math.floor(Date.now() / 1000) + result.retryAfter;

  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(Math.max(0, result.remaining)),
    'X-RateLimit-Reset': String(reset),
    ...(result.retryAfter > 0 ? { 'Retry-After': String(result.retryAfter) } : {}),
  };
}
