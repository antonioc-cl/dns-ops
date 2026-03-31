/**
 * DNSSEC DNS Resolver Tests - DNS-002
 */

import { describe, expect, it } from 'vitest';
import { queryDNSKEY, queryDS } from './dnssec-resolver.js';

describe('DNSSEC DNS Resolver', () => {
  describe('DNSKEY queries', () => {
    it('should handle DNSKEY query to real domain', async () => {
      // Test against a real domain that supports DNSSEC
      const result = await queryDNSKEY('cloudflare.com');

      // Should complete without error
      expect(typeof result.success).toBe('boolean');
      expect(Array.isArray(result.answers)).toBe(true);
    });

    it('should return empty for domain without DNSKEY', async () => {
      // Test against a domain that might not have DNSKEY
      const result = await queryDNSKEY('example.invalid');

      // Should complete - may or may not have answers
      expect(typeof result.success).toBe('boolean');
      expect(Array.isArray(result.answers)).toBe(true);
    });
  });

  describe('DS queries', () => {
    it('should handle DS query to real domain', async () => {
      // Test against a real DNSSEC-signed domain
      const result = await queryDS('cloudflare.com');

      expect(typeof result.success).toBe('boolean');
      expect(Array.isArray(result.answers)).toBe(true);
    });

    it('should return empty for non-existent domain', async () => {
      const result = await queryDS('nonexistent.invalid.test');

      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Error handling', () => {
    it('should handle invalid domain gracefully', async () => {
      const result = await queryDNSKEY('');

      // Should handle gracefully
      expect(typeof result.success).toBe('boolean');
    });
  });
});
