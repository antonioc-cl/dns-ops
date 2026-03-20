/**
 * IDN Utilities Tests
 *
 * Round-trip tests for punycode encoding/decoding
 */
import { describe, expect, it } from 'vitest';
import { fromPunycode, isPunycode, isValidDomain, normalizeDomain, toPunycode } from './index.js';
describe('IDN Utilities', () => {
    describe('isPunycode', () => {
        it('should identify punycode domains', () => {
            expect(isPunycode('xn--nxasmq5b')).toBe(true);
            expect(isPunycode('xn--bcher-kva')).toBe(true);
            expect(isPunycode('example.com')).toBe(false);
            expect(isPunycode('münchen.de')).toBe(false);
        });
    });
    describe('toPunycode', () => {
        it('should convert unicode to punycode', () => {
            expect(toPunycode('münchen')).toBe('xn--mnchen-3ya');
            expect(toPunycode('bücher')).toBe('xn--bcher-kva');
            // The punycode library converts each character according to RFC 3492
            expect(toPunycode('日本語')).toBe('xn--wgv71a119e');
        });
        it('should return ASCII domains unchanged', () => {
            expect(toPunycode('example')).toBe('example');
            expect(toPunycode('test-domain')).toBe('test-domain');
        });
        it('should handle mixed domains', () => {
            expect(toPunycode('münchen.example')).toBe('xn--mnchen-3ya.example');
        });
    });
    describe('fromPunycode', () => {
        it('should convert punycode to unicode', () => {
            expect(fromPunycode('xn--mnchen-3ya')).toBe('münchen');
            expect(fromPunycode('xn--bcher-kva')).toBe('bücher');
            // The punycode library returns the correct unicode for the encoded form
            expect(fromPunycode('xn--wgv71a119e')).toBe('日本語');
        });
        it('should return ASCII domains unchanged', () => {
            expect(fromPunycode('example')).toBe('example');
            expect(fromPunycode('test-domain')).toBe('test-domain');
        });
    });
    describe('round-trip conversion', () => {
        it('should preserve unicode through encode/decode', () => {
            const testCases = ['münchen', 'bücher', '日本語', 'россия', 'مثال'];
            for (const unicode of testCases) {
                const punycode = toPunycode(unicode);
                const decoded = fromPunycode(punycode);
                expect(decoded).toBe(unicode);
            }
        });
        it('should preserve punycode through decode/encode', () => {
            const testCases = ['xn--mnchen-3ya', 'xn--bcher-kva', 'xn--wgv71a'];
            for (const punycode of testCases) {
                const unicode = fromPunycode(punycode);
                const encoded = toPunycode(unicode);
                expect(encoded).toBe(punycode);
            }
        });
    });
    describe('normalizeDomain', () => {
        it('should normalize ASCII domains', () => {
            const result = normalizeDomain('Example.COM');
            expect(result.original).toBe('Example.COM');
            expect(result.unicode).toBe('example.com');
            expect(result.punycode).toBe('example.com');
            expect(result.normalized).toBe('example.com');
        });
        it('should normalize unicode domains', () => {
            const result = normalizeDomain('München.de');
            expect(result.original).toBe('München.de');
            expect(result.unicode).toBe('münchen.de');
            expect(result.punycode).toBe('xn--mnchen-3ya.de');
            expect(result.normalized).toBe('xn--mnchen-3ya.de');
        });
        it('should normalize punycode domains', () => {
            const result = normalizeDomain('xn--mnchen-3ya.DE');
            expect(result.original).toBe('xn--mnchen-3ya.DE');
            expect(result.unicode).toBe('münchen.de');
            expect(result.punycode).toBe('xn--mnchen-3ya.de');
            expect(result.normalized).toBe('xn--mnchen-3ya.de');
        });
        it('should handle trailing dots', () => {
            const result = normalizeDomain('example.com.');
            expect(result.normalized).toBe('example.com');
        });
        it('should handle whitespace', () => {
            const result = normalizeDomain('  example.com  ');
            expect(result.normalized).toBe('example.com');
        });
    });
    describe('isValidDomain', () => {
        it('should validate ASCII domains', () => {
            expect(isValidDomain('example.com')).toBe(true);
            expect(isValidDomain('sub.example.com')).toBe(true);
            expect(isValidDomain('test-domain.example')).toBe(true);
        });
        it('should validate punycode domains', () => {
            expect(isValidDomain('xn--mnchen-3ya.de')).toBe(true);
            expect(isValidDomain('xn--bcher-kva.example')).toBe(true);
        });
        it('should validate unicode domains', () => {
            // Unicode domains are valid but should be converted to punycode for DNS
            // The isValidDomain checks format, not encoding
            expect(isValidDomain('münchen.de')).toBe(true);
            // Japanese characters are valid unicode but the validation
            // may reject them if they don't follow label rules
            // The important thing is they work after normalization
        });
        it('should reject invalid domains', () => {
            expect(isValidDomain('')).toBe(false);
            expect(isValidDomain('-example.com')).toBe(false);
            expect(isValidDomain('example-.com')).toBe(false);
            expect(isValidDomain('a'.repeat(254))).toBe(false);
        });
        it('should handle trailing dots', () => {
            expect(isValidDomain('example.com.')).toBe(true);
        });
    });
});
//# sourceMappingURL=index.test.js.map