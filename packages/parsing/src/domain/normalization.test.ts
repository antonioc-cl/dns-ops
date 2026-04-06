import { describe, expect, it } from 'vitest';
import { isValidDomain, normalizeDomain } from './index.js';

describe('domain normalization', () => {
  describe('normalizeDomain', () => {
    it('should convert ASCII domains to lowercase', () => {
      const result = normalizeDomain('EXAMPLE.COM');
      expect(result.normalized).toBe('example.com');
      expect(result.unicode).toBe('example.com');
      expect(result.punycode).toBe('example.com');
    });

    it('should handle mixed case domains', () => {
      const result = normalizeDomain('ExAmPlE.CoM');
      expect(result.normalized).toBe('example.com');
    });

    it('should strip trailing dot', () => {
      const result = normalizeDomain('example.com.');
      expect(result.normalized).toBe('example.com');
    });

    it('should reject multiple trailing dots', () => {
      // example.com.. creates an empty label after stripping one trailing dot
      expect(() => normalizeDomain('example.com..')).toThrow('empty label');
    });

    it('should convert Unicode/IDN to punycode round-trip', () => {
      const result = normalizeDomain('münchen.de');
      expect(result.punycode).toBe('xn--mnchen-3ya.de');
      expect(result.unicode).toBe('münchen.de');
      expect(result.normalized).toBe('xn--mnchen-3ya.de');
    });

    it('should handle existing punycode domains', () => {
      const result = normalizeDomain('XN--Mnchen-3YA.DE');
      expect(result.punycode).toBe('xn--mnchen-3ya.de');
      expect(result.unicode).toBe('münchen.de');
      expect(result.normalized).toBe('xn--mnchen-3ya.de');
    });

    it('should trim whitespace from domain', () => {
      const result = normalizeDomain('  example.com  ');
      expect(result.normalized).toBe('example.com');
    });

    it('should trim whitespace and handle trailing dot', () => {
      const result = normalizeDomain('  example.com.  ');
      expect(result.normalized).toBe('example.com');
    });

    it('should preserve original domain in result', () => {
      const original = 'EXAMPLE.COM.';
      const result = normalizeDomain(original);
      expect(result.original).toBe(original);
    });

    it('should handle single-label domains', () => {
      const result = normalizeDomain('localhost');
      expect(result.normalized).toBe('localhost');
      expect(result.unicode).toBe('localhost');
      expect(result.punycode).toBe('localhost');
    });

    it('should handle numeric TLDs', () => {
      const result = normalizeDomain('example.123');
      expect(result.normalized).toBe('example.123');
    });

    it('should reject empty string', () => {
      expect(() => normalizeDomain('')).toThrow();
    });

    it('should reject whitespace-only string', () => {
      expect(() => normalizeDomain('   ')).toThrow();
    });

    it('should reject domains exceeding 253 characters', () => {
      const longDomain = `${'a'.repeat(250)}.com`;
      expect(() => normalizeDomain(longDomain)).toThrow();
    });

    it('should reject double-dot in domain', () => {
      expect(() => normalizeDomain('example..com')).toThrow();
    });

    it('should reject domains with spaces', () => {
      expect(() => normalizeDomain('exam ple.com')).toThrow();
    });

    it('should reject domains with invalid characters', () => {
      expect(() => normalizeDomain('exam!ple.com')).toThrow();
    });

    it('should reject domains starting with hyphen', () => {
      expect(() => normalizeDomain('-example.com')).toThrow();
    });

    it('should reject domains ending with hyphen', () => {
      expect(() => normalizeDomain('example-.com')).toThrow();
    });

    it('should reject label exceeding 63 characters', () => {
      const longLabel = 'a'.repeat(64);
      expect(() => normalizeDomain(`${longLabel}.com`)).toThrow();
    });

    it('should handle subdomains correctly', () => {
      const result = normalizeDomain('sub.domain.example.com');
      expect(result.normalized).toBe('sub.domain.example.com');
    });

    it('should handle IDN with multiple labels', () => {
      const result = normalizeDomain('www.münchen.de');
      expect(result.punycode).toBe('www.xn--mnchen-3ya.de');
      expect(result.unicode).toBe('www.münchen.de');
    });
  });

  describe('isValidDomain', () => {
    it('should return true for valid ASCII domains', () => {
      expect(isValidDomain('example.com')).toBe(true);
    });

    it('should return true for valid IDN domains', () => {
      expect(isValidDomain('münchen.de')).toBe(true);
    });

    it('should return true for valid punycode domains', () => {
      expect(isValidDomain('xn--mnchen-3ya.de')).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(isValidDomain('')).toBe(false);
    });

    it('should return false for null', () => {
      expect(isValidDomain(null as unknown as string)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isValidDomain(undefined as unknown as string)).toBe(false);
    });

    it('should return false for domains exceeding 253 characters', () => {
      const longDomain = `${'a'.repeat(250)}.com`;
      expect(isValidDomain(longDomain)).toBe(false);
    });

    it('should return false for labels exceeding 63 characters', () => {
      const longLabel = 'a'.repeat(64);
      expect(isValidDomain(`${longLabel}.com`)).toBe(false);
    });

    it('should return false for domains starting with hyphen', () => {
      expect(isValidDomain('-example.com')).toBe(false);
    });

    it('should return false for domains ending with hyphen', () => {
      expect(isValidDomain('example-.com')).toBe(false);
    });

    it('should return false for domains with double-dot', () => {
      expect(isValidDomain('example..com')).toBe(false);
    });

    it('should return false for domains with spaces', () => {
      expect(isValidDomain('exam ple.com')).toBe(false);
    });

    it('should handle single-label domains', () => {
      expect(isValidDomain('localhost')).toBe(true);
    });

    it('should handle numeric TLDs', () => {
      expect(isValidDomain('example.123')).toBe(true);
    });

    it('should return true for domains with trailing dot', () => {
      expect(isValidDomain('example.com.')).toBe(true);
    });
  });
});
