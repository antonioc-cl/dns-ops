import { Result } from '@dns-ops/contracts';
import { describe, expect, it } from 'vitest';
import {
  DomainValidationError,
  normalizeDomainResult,
  normalizeDomainsResult,
  partitionDomainResults,
  tryNormalizeDomainResult,
} from './result.js';

describe('Domain Result Utilities', () => {
  describe('normalizeDomainResult', () => {
    it('should return Ok for valid domain', () => {
      const result = normalizeDomainResult('Example.COM');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.normalized).toBe('example.com');
        expect(result.value.unicode).toBe('example.com');
        expect(result.value.punycode).toBe('example.com');
        expect(result.value.original).toBe('Example.COM');
      }
    });

    it('should handle IDN domains', () => {
      const result = normalizeDomainResult('münchen.de');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.normalized).toBe('xn--mnchen-3ya.de');
        expect(result.value.unicode).toBe('münchen.de');
      }
    });

    it('should return Err for empty domain', () => {
      const result = normalizeDomainResult('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(DomainValidationError);
        expect(result.error.details?.code).toBe('EMPTY_DOMAIN');
      }
    });

    it('should return Err for domain with double dots', () => {
      const result = normalizeDomainResult('invalid..domain.com');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.details?.code).toBe('DOUBLE_DOT');
      }
    });

    it('should return Err for domain starting with hyphen', () => {
      const result = normalizeDomainResult('-invalid.com');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.details?.code).toBe('INVALID_FORMAT');
      }
    });

    it('should return Err for domain ending with hyphen', () => {
      const result = normalizeDomainResult('invalid-.com');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.details?.code).toBe('INVALID_FORMAT');
      }
    });

    it('should return Err for domain with spaces', () => {
      const result = normalizeDomainResult('invalid domain.com');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.details?.code).toBe('INVALID_CHARACTERS');
      }
    });

    it('should return Err for domain too long', () => {
      const longDomain = 'a'.repeat(254) + '.com';
      const result = normalizeDomainResult(longDomain);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.details?.code).toBe('DOMAIN_TOO_LONG');
      }
    });

    it('should support pattern matching with Result.match', () => {
      const result = normalizeDomainResult('Test.Example.COM');

      const message = Result.match(result, {
        ok: (d) => `Success: ${d.normalized}`,
        err: (e) => `Error: ${e.message}`,
      });

      expect(message).toBe('Success: test.example.com');
    });

    it('should support error pattern matching', () => {
      const result = normalizeDomainResult('');

      const message = Result.match(result, {
        ok: (d) => `Success: ${d.normalized}`,
        err: (e) => `Error: ${e.details?.code}`,
      });

      expect(message).toBe('Error: EMPTY_DOMAIN');
    });
  });

  describe('normalizeDomainsResult (batch)', () => {
    it('should process multiple domains', () => {
      const domains = ['example.com', 'EXAMPLE.ORG', 'test.io'];
      const results = normalizeDomainsResult(domains);

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.isOk())).toBe(true);
    });

    it('should handle mixed valid and invalid domains', () => {
      const domains = ['example.com', '', 'test.io'];
      const results = normalizeDomainsResult(domains);

      expect(results[0].isOk()).toBe(true);
      expect(results[1].isErr()).toBe(true);
      expect(results[2].isOk()).toBe(true);
    });
  });

  describe('partitionDomainResults', () => {
    it('should separate successes and failures', () => {
      const domains = ['example.com', '', 'test.io', 'invalid..domain'];
      const { ok, err } = partitionDomainResults(domains);

      expect(ok).toHaveLength(2);
      expect(err).toHaveLength(2);

      expect(ok[0]?.normalized).toBe('example.com');
      expect(ok[1]?.normalized).toBe('test.io');

      expect(err[0]?.details?.code).toBe('EMPTY_DOMAIN');
      expect(err[1]?.details?.code).toBe('DOUBLE_DOT');
    });

    it('should handle all successes', () => {
      const domains = ['a.com', 'b.com', 'c.com'];
      const { ok, err } = partitionDomainResults(domains);

      expect(ok).toHaveLength(3);
      expect(err).toHaveLength(0);
    });

    it('should handle all failures', () => {
      const domains = ['', '-bad', 'also..bad'];
      const { ok, err } = partitionDomainResults(domains);

      expect(ok).toHaveLength(0);
      expect(err).toHaveLength(3);
    });
  });

  describe('tryNormalizeDomainResult (legacy bridge)', () => {
    it('should return Ok for valid domain', () => {
      const result = tryNormalizeDomainResult('example.com');
      expect(result.isOk()).toBe(true);
    });

    it('should return Err for invalid domain', () => {
      const result = tryNormalizeDomainResult('');
      expect(result.isErr()).toBe(true);
    });
  });

  describe('DomainValidationError', () => {
    it('should have correct error structure', () => {
      const error = new DomainValidationError({
        message: 'Test message',
        code: 'INVALID_FORMAT',
        domain: 'test.com',
      });

      expect(error.message).toBe('Test message');
      expect(error.details?.code).toBe('INVALID_FORMAT');
      expect(error.details?.domain).toBe('test.com');
      expect(error._tag).toBe('ValidationError');
    });

    it('should include details in error object', () => {
      const error = new DomainValidationError({
        message: 'Test',
        code: 'DOUBLE_DOT',
        domain: 'a..b',
      });

      expect(error.details).toEqual({
        code: 'DOUBLE_DOT',
        domain: 'a..b',
      });
    });
  });
});
