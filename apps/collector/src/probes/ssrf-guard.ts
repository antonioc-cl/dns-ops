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

// IPv4 private ranges (RFC 1918 + others)
const BLOCKED_IPV4_RANGES = [
  { start: 0x00000000, end: 0x00FFFFFF, name: '0.0.0.0/8 (this network)' },
  { start: 0x7F000000, end: 0x7FFFFFFF, name: '127.0.0.0/8 (loopback)' },
  { start: 0x0A000000, end: 0x0AFFFFFF, name: '10.0.0.0/8 (private)' },
  { start: 0xAC100000, end: 0xAC1FFFFF, name: '172.16.0.0/12 (private)' },
  { start: 0xC0A80000, end: 0xC0A8FFFF, name: '192.168.0.0/16 (private)' },
  { start: 0xA9FE0000, end: 0xA9FEFFFF, name: '169.254.0.0/16 (link-local)' },
  { start: 0xE0000000, end: 0xEFFFFFFF, name: '224.0.0.0/4 (multicast)' },
  { start: 0xF0000000, end: 0xFFFFFFFF, name: '240.0.0.0/4 (reserved)' },
  { start: 0xC0000200, end: 0xC00002FF, name: '192.0.2.0/24 (TEST-NET-1)' },
  { start: 0xC6336400, end: 0xC63364FF, name: '198.51.100.0/24 (TEST-NET-2)' },
  { start: 0xCB007100, end: 0xCB0071FF, name: '203.0.113.0/24 (TEST-NET-3)' },
];

// IPv6 blocked ranges
const BLOCKED_IPV6_PREFIXES = [
  { prefix: '::1', name: '::1/128 (loopback)' },
  { prefix: 'fe80:', name: 'fe80::/10 (link-local)' },
  { prefix: 'fc00:', name: 'fc00::/7 (unique local)' },
  { prefix: 'ff00:', name: 'ff00::/8 (multicast)' },
  { prefix: '::', name: '::/128 (unspecified)' },
];

/**
 * Check if an IPv4 address is in a blocked range
 */
function ipv4ToInt(ip: string): number {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    return -1;
  }
  return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

/**
 * Check if an IPv4 address is blocked
 */
function checkIPv4(ip: string): SSRFCheckResult {
  const ipInt = ipv4ToInt(ip);
  if (ipInt === -1) {
    return { allowed: false, reason: 'Invalid IPv4 address', blockedCategory: 'invalid' };
  }

  for (const range of BLOCKED_IPV4_RANGES) {
    if (ipInt >= range.start && ipInt <= range.end) {
      return {
        allowed: false,
        reason: `Blocked: ${range.name}`,
        blockedCategory: range.name.includes('loopback') ? 'loopback' :
                        range.name.includes('link-local') ? 'link-local' :
                        range.name.includes('multicast') ? 'multicast' :
                        range.name.includes('private') ? 'private' : 'reserved',
      };
    }
  }

  return { allowed: true };
}

/**
 * Normalize and check IPv6 address
 */
function checkIPv6(ip: string): SSRFCheckResult {
  // Normalize IPv6 (expand ::, lowercase)
  const normalized = ip.toLowerCase().trim();

  for (const blocked of BLOCKED_IPV6_PREFIXES) {
    if (normalized.startsWith(blocked.prefix)) {
      return {
        allowed: false,
        reason: `Blocked: ${blocked.name}`,
        blockedCategory: blocked.name.includes('loopback') ? 'loopback' :
                        blocked.name.includes('link-local') ? 'link-local' :
                        blocked.name.includes('multicast') ? 'multicast' :
                        blocked.name.includes('local') ? 'private' : 'reserved',
      };
    }
  }

  return { allowed: true };
}

/**
 * Check if a hostname is blocked (localhost, etc.)
 */
function checkHostname(hostname: string): SSRFCheckResult {
  const lower = hostname.toLowerCase().trim();

  // Block localhost variants
  if (lower === 'localhost' || lower.endsWith('.localhost')) {
    return { allowed: false, reason: 'Blocked: localhost', blockedCategory: 'loopback' };
  }

  // Block empty hostname
  if (!lower) {
    return { allowed: false, reason: 'Blocked: empty hostname', blockedCategory: 'invalid' };
  }

  return { allowed: true };
}

/**
 * Main SSRF check function
 * Validates IP addresses and hostnames
 */
export function checkSSRF(target: string): SSRFCheckResult {
  // Try parsing as IP address first
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(target)) {
    return checkIPv4(target);
  }

  // Check for IPv6 format (contains colons)
  if (target.includes(':')) {
    return checkIPv6(target);
  }

  // Otherwise treat as hostname
  return checkHostname(target);
}

/**
 * Validate that a URL is safe to fetch
 * Checks hostname/IP against SSRF blocklists
 */
export function validateUrl(url: string): SSRFCheckResult & { url?: URL } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { allowed: false, reason: 'Invalid URL', blockedCategory: 'invalid' };
  }

  // Only allow http/https protocols
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { allowed: false, reason: `Blocked protocol: ${parsed.protocol}`, blockedCategory: 'invalid' };
  }

  // Check the hostname
  const result = checkSSRF(parsed.hostname);
  if (!result.allowed) {
    return result;
  }

  return { allowed: true, url: parsed };
}

/**
 * Check if an IP address is in the allowed range
 * Used after DNS resolution to prevent DNS rebinding attacks
 * @deprecated Use checkSSRF directly - this is now an alias
 */
export function checkResolvedIP(ip: string): SSRFCheckResult {
  return checkSSRF(ip);
}
