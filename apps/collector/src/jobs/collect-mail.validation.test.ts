/**
 * Mail Collection Validation Tests - PR-11.1
 *
 * Tests for input validation on POST /api/collect/mail endpoints.
 * Validates domain, preferredProvider, and explicitSelectors.
 */

import { KNOWN_MAIL_PROVIDERS, validateCollectMailRequestDetailed } from '@dns-ops/contracts';
import { describe, expect, it } from 'vitest';

describe('POST /api/collect/mail - Validation (PR-11.1)', () => {
  describe('validateCollectMailRequestDetailed', () => {
    it('accepts valid minimal request (domain only)', () => {
      const result = validateCollectMailRequestDetailed({ domain: 'example.com' });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('accepts valid request with all fields', () => {
      const result = validateCollectMailRequestDetailed({
        domain: 'example.com',
        preferredProvider: 'google',
        explicitSelectors: ['selector1', 'selector2'],
      });
      expect(result.valid).toBe(true);
    });

    it('rejects missing domain', () => {
      const result = validateCollectMailRequestDetailed({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Domain is required and must be a non-empty string');
    });

    it('rejects empty domain string', () => {
      const result = validateCollectMailRequestDetailed({ domain: '' });
      expect(result.valid).toBe(false);
    });

    it('rejects non-string domain', () => {
      const result = validateCollectMailRequestDetailed({ domain: 123 });
      expect(result.valid).toBe(false);
    });

    it('rejects null request', () => {
      const result = validateCollectMailRequestDetailed(null);
      expect(result.valid).toBe(false);
    });

    it('rejects non-object request', () => {
      const result = validateCollectMailRequestDetailed('string');
      expect(result.valid).toBe(false);
    });

    // preferredProvider validation

    it('accepts each known provider', () => {
      for (const provider of KNOWN_MAIL_PROVIDERS) {
        const result = validateCollectMailRequestDetailed({
          domain: 'example.com',
          preferredProvider: provider,
        });
        expect(result.valid, `Provider "${provider}" should be valid`).toBe(true);
      }
    });

    it('accepts undefined preferredProvider (optional)', () => {
      const result = validateCollectMailRequestDetailed({
        domain: 'example.com',
        preferredProvider: undefined,
      });
      expect(result.valid).toBe(true);
    });

    it('accepts null preferredProvider (optional)', () => {
      const result = validateCollectMailRequestDetailed({
        domain: 'example.com',
        preferredProvider: null,
      });
      expect(result.valid).toBe(true);
    });

    it('rejects unknown preferredProvider', () => {
      const result = validateCollectMailRequestDetailed({
        domain: 'example.com',
        preferredProvider: 'nonexistent-provider',
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('preferredProvider must be one of');
    });

    it('rejects non-string preferredProvider', () => {
      const result = validateCollectMailRequestDetailed({
        domain: 'example.com',
        preferredProvider: 123,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('preferredProvider must be a string');
    });

    // explicitSelectors validation

    it('accepts valid explicitSelectors array', () => {
      const result = validateCollectMailRequestDetailed({
        domain: 'example.com',
        explicitSelectors: ['selector1', 'selector2', 'selector3'],
      });
      expect(result.valid).toBe(true);
    });

    it('accepts empty explicitSelectors array', () => {
      const result = validateCollectMailRequestDetailed({
        domain: 'example.com',
        explicitSelectors: [],
      });
      expect(result.valid).toBe(true);
    });

    it('accepts undefined explicitSelectors (optional)', () => {
      const result = validateCollectMailRequestDetailed({
        domain: 'example.com',
        explicitSelectors: undefined,
      });
      expect(result.valid).toBe(true);
    });

    it('accepts null explicitSelectors (optional)', () => {
      const result = validateCollectMailRequestDetailed({
        domain: 'example.com',
        explicitSelectors: null,
      });
      expect(result.valid).toBe(true);
    });

    it('rejects explicitSelectors exceeding 20 items', () => {
      const selectors = Array.from({ length: 21 }, (_, i) => `selector${i}`);
      const result = validateCollectMailRequestDetailed({
        domain: 'example.com',
        explicitSelectors: selectors,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('explicitSelectors must have at most 20 items');
    });

    it('accepts explicitSelectors with exactly 20 items', () => {
      const selectors = Array.from({ length: 20 }, (_, i) => `selector${i}`);
      const result = validateCollectMailRequestDetailed({
        domain: 'example.com',
        explicitSelectors: selectors,
      });
      expect(result.valid).toBe(true);
    });

    it('rejects non-array explicitSelectors', () => {
      const result = validateCollectMailRequestDetailed({
        domain: 'example.com',
        explicitSelectors: 'not-an-array',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('explicitSelectors must be an array');
    });

    it('rejects explicitSelectors with non-string items', () => {
      const result = validateCollectMailRequestDetailed({
        domain: 'example.com',
        explicitSelectors: ['valid', 123, 'also-valid'],
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('explicitSelectors[1] must be a string');
    });

    // Multiple errors

    it('reports multiple validation errors', () => {
      const result = validateCollectMailRequestDetailed({
        domain: '',
        preferredProvider: 42,
        explicitSelectors: 'not-array',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });
});
