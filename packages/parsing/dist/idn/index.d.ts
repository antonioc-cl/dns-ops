/**
 * IDN (Internationalized Domain Name) Utilities
 *
 * Handle punycode encoding/decoding for international domain names.
 * Uses the 'punycode' package for proper RFC 3492 implementation.
 */
/**
 * Check if a domain name is punycode encoded
 */
export declare function isPunycode(name: string): boolean;
/**
 * Convert Unicode domain to Punycode (ASCII)
 * Uses proper RFC 3492 implementation via the punycode package
 */
export declare function toPunycode(unicode: string): string;
/**
 * Convert Punycode to Unicode
 * Uses proper RFC 3492 implementation via the punycode package
 */
export declare function fromPunycode(punycode: string): string;
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
 * Handles both ASCII and Unicode domains
 */
export declare function isValidDomain(name: string): boolean;
//# sourceMappingURL=index.d.ts.map