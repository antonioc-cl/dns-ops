/**
 * Rate Limiter Tests
 */

import { describe, expect, it } from 'vitest';
import { checkRateLimit, RATE_LIMITS } from './rate-limit.js';

describe('Rate Limiter', () => {
  describe('Rate limit configurations', () => {
    it('has collect rate limit of 10 req/min', () => {
      expect(RATE_LIMITS.collect.limit).toBe(10);
      expect(RATE_LIMITS.collect.windowMs).toBe(60000);
    });

    it('has probes rate limit of 5 req/min', () => {
      expect(RATE_LIMITS.probes.limit).toBe(5);
      expect(RATE_LIMITS.probes.windowMs).toBe(60000);
    });
  });

  describe('checkRateLimit', () => {
    it('allows first request for new tenant', () => {
      const result = checkRateLimit('collect', 'tenant-new');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('allows requests within limit', () => {
      const tenantId = 'tenant-limited';

      // Make 10 requests
      for (let i = 0; i < 10; i++) {
        const result = checkRateLimit('collect', tenantId);
        expect(result.allowed).toBe(true);
      }
    });

    it('blocks requests over limit', () => {
      const tenantId = 'tenant-over-limit';

      // Make 10 requests (at limit)
      for (let i = 0; i < 10; i++) {
        checkRateLimit('collect', tenantId);
      }

      // 11th request should be blocked
      const result = checkRateLimit('collect', tenantId);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('tracks different tenants separately', () => {
      const tenant1 = 'tenant-1';
      const tenant2 = 'tenant-2';

      // Use up tenant1's limit
      for (let i = 0; i < 10; i++) {
        checkRateLimit('collect', tenant1);
      }

      // tenant1 should be blocked
      expect(checkRateLimit('collect', tenant1).allowed).toBe(false);

      // tenant2 should still be allowed
      expect(checkRateLimit('collect', tenant2).allowed).toBe(true);
    });

    it('allows request without tenant (skip rate limiting)', () => {
      const result = checkRateLimit('collect', undefined);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(10);
    });

    it('has stricter limit for probes', () => {
      const tenantId = 'tenant-probes';

      // Use up 5 probe requests
      for (let i = 0; i < 5; i++) {
        checkRateLimit('probes', tenantId);
      }

      // 6th probe request should be blocked
      const result = checkRateLimit('probes', tenantId);
      expect(result.allowed).toBe(false);
    });

    it('provides retry-after in seconds', () => {
      const tenantId = 'tenant-retry';

      // Use up all requests
      for (let i = 0; i < 10; i++) {
        checkRateLimit('collect', tenantId);
      }

      const result = checkRateLimit('collect', tenantId);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThanOrEqual(0);
      expect(result.retryAfter).toBeLessThanOrEqual(60);
    });

    it('includes correct rate limit headers', () => {
      const result = checkRateLimit('collect', 'tenant-headers');
      expect(result.limit).toBe(10);
      expect(result.remaining).toBe(9);
    });
  });
});
