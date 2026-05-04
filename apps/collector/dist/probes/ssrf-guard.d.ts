/**
 * SSRF Guard - Bead 10
 *
 * Prevents Server-Side Request Forgery by blocking:
 * - Private/internal address space (RFC 1918, RFC 4193)
 * - Loopback addresses
 * - Link-local addresses
 * - Multicast addresses
 * - Reserved addresses
 * - IPv4-mapped IPv6 addresses that embed private/loopback IPv4
 *
 * Security review: docs/security/probe-sandbox-review.md
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
/**
 * Resolve a hostname and verify the resolved IP is safe.
 *
 * Closes the DNS rebinding TOCTOU gap: validateUrl() checks the hostname
 * string, but fetch() resolves DNS independently. An attacker can register
 * a domain that resolves to a public IP on first query and a private IP
 * on the second. This function resolves first, checks the result, then
 * returns the resolved IP for the caller to connect to directly.
 *
 * NOTE: This narrows but does not fully close the TOCTOU window. Node's
 * `fetch()` re-resolves DNS independently — a sub-millisecond TTL switch
 * between our check and fetch's resolution is theoretically possible.
 * Full closure requires `net.connect({ lookup })` which only applies to
 * raw TCP/TLS (probe system), not HTTP fetch. The two-step check is the
 * industry-standard mitigation for HTTP-based SSRF.
 *
 * @returns The resolved IP address if safe, or an SSRFCheckResult if blocked.
 */
export declare function resolveAndCheck(hostname: string): Promise<{
    allowed: true;
    ip: string;
} | (SSRFCheckResult & {
    allowed: false;
})>;
//# sourceMappingURL=ssrf-guard.d.ts.map