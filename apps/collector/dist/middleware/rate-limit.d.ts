/**
 * Rate Limiting Middleware
 *
 * Token-bucket rate limiter for collector endpoints.
 * Limits requests per tenant to prevent abuse.
 */
import type { Context, Next } from 'hono';
/**
 * Rate limit middleware for Hono
 * @param scope - The scope to rate limit ('collect' or 'probes')
 */
export declare function rateLimitMiddleware(scope: 'collect' | 'probes'): (c: Context, next: Next) => Promise<void | (Response & import("hono").TypedResponse<{
    error: string;
    code: string;
    message: string;
    retryAfter: number;
}>)>;
/**
 * Reset rate limit for a specific tenant (for testing)
 */
export declare function resetRateLimit(tenantId?: string, path?: string): void;
/**
 * Get current rate limit status (for testing/monitoring)
 */
export declare function getRateLimitStatus(tenantId: string, path: string): {
    limit: number;
    remaining: number;
    resetMs: number;
} | null;
/**
 * Check rate limit without middleware (for testing)
 * Returns { allowed: boolean, remaining: number }
 *
 * @param scope - 'collect' or 'probes' (maps to base paths)
 * @param tenantId - Optional tenant ID (if undefined, no rate limiting applies)
 * @param path - Optional custom path (defaults to scope base path)
 */
export declare function checkRateLimit(scope: 'collect' | 'probes', tenantId?: string, path?: string): {
    allowed: boolean;
    remaining: number;
    retryAfter?: number;
};
//# sourceMappingURL=rate-limit.d.ts.map