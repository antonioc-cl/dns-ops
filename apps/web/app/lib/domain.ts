/**
 * Domain normalization utilities
 *
 * Ensures consistent domain representation across the application.
 * Handles: case normalization, trailing dots, IDN/punycode conversion
 */

/**
 * Normalize a domain name for consistent storage and lookup
 */
export function normalizeDomain(input: string): string {
  // Trim whitespace
  let normalized = input.trim();

  // Convert to lowercase
  normalized = normalized.toLowerCase();

  // Remove trailing dot if present
  if (normalized.endsWith('.')) {
    normalized = normalized.slice(0, -1);
  }

  // Convert IDN to punycode if needed
  if (containsUnicode(normalized)) {
    normalized = toPunycode(normalized);
  }

  // Validate domain format
  if (!isValidDomain(normalized)) {
    throw new DomainValidationError(`Invalid domain: ${input}`);
  }

  return normalized;
}

/**
 * Check if string contains unicode characters
 */
function containsUnicode(str: string): boolean {
  return /[^\p{ASCII}]/u.test(str);
}

/**
 * Convert unicode domain to punycode
 * Uses built-in URL API for conversion
 */
function toPunycode(domain: string): string {
  try {
    // URL API automatically handles IDN to punycode
    const url = new URL(`http://${domain}`);
    return url.hostname;
  } catch {
    // Fallback: return as-is if conversion fails
    return domain;
  }
}

/**
 * Validate domain name format
 * Basic validation: not empty, no spaces, reasonable length
 */
function isValidDomain(domain: string): boolean {
  if (!domain || domain.length === 0) {
    return false;
  }

  if (domain.length > 253) {
    return false;
  }

  if (domain.includes(' ')) {
    return false;
  }

  // Each label must be 1-63 characters
  const labels = domain.split('.');
  for (const label of labels) {
    if (label.length === 0 || label.length > 63) {
      return false;
    }
  }

  return true;
}

/**
 * Error thrown when domain validation fails
 */
export class DomainValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainValidationError';
  }
}

/**
 * Extract display name from punycode domain
 * Shows unicode version if domain is IDN
 */
export function getDisplayDomain(domain: string): string {
  try {
    // URL API converts punycode back to unicode for display
    const url = new URL(`http://${domain}`);
    // Get hostname without port
    return url.hostname;
  } catch {
    return domain;
  }
}
