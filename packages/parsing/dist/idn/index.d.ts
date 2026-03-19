/**
 * IDN (Internationalized Domain Name) Utilities
 *
 * Handle punycode encoding/decoding for international domain names.
 */
/**
 * Check if a domain name is punycode encoded
 */
export declare function isPunycode(name: string): boolean;
/**
 * Convert Unicode domain to Punycode (ASCII)
 * Note: This is a simplified implementation
 * For production, use the 'punycode' npm package
 */
export declare function toPunycode(unicode: string): string;
/**
 * Convert Punycode to Unicode
 * Note: This is a simplified implementation
 * For production, use the 'punycode' npm package
 */
export declare function toUnicode(punycode: string): string;
/**
 * Normalize a domain name (handles IDN conversion)
 */
export declare function normalizeDomain(name: string): {
    original: string;
    unicode: string;
    punycode: string;
    normalized: string;
};
/**
 * Validate domain name format
 */
export declare function isValidDomain(name: string): boolean;
//# sourceMappingURL=index.d.ts.map