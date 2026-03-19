/**
 * SSRF Guard - Bead 10
 *
 * Prevents Server-Side Request Forgery by blocking:
 * - Private/internal address space (RFC 1918, RFC 4193)
 * - Loopback addresses
 * - Link-local addresses
 * - Multicast addresses
 * - Reserved addresses
 */
export interface SSRFCheckResult {
    allowed: boolean;
    reason?: string;
    blockedCategory?: 'private' | 'loopback' | 'link-local' | 'multicast' | 'reserved' | 'invalid';
}
/**
 * Main SSRF check function
 * Validates IP addresses and hostnames
 */
export declare function checkSSRF(target: string): SSRFCheckResult;
/**
 * Validate that a URL is safe to fetch
 * Checks hostname/IP against SSRF blocklists
 */
export declare function validateUrl(url: string): SSRFCheckResult & {
    url?: URL;
};
/**
 * Check if an IP address is in the allowed range
 * Used after DNS resolution to prevent DNS rebinding attacks
 * @deprecated Use checkSSRF directly - this is now an alias
 */
export declare function checkResolvedIP(ip: string): SSRFCheckResult;
//# sourceMappingURL=ssrf-guard.d.ts.map