/**
 * IDN (Internationalized Domain Name) Utilities
 *
 * Handle punycode encoding/decoding for international domain names.
 */

// Simple punycode implementation for DNS Ops
// In production, consider using the 'punycode' package

const PREFIX = 'xn--';

/**
 * Check if a domain name is punycode encoded
 */
export function isPunycode(name: string): boolean {
  return name.startsWith(PREFIX);
}

/**
 * Convert Unicode domain to Punycode (ASCII)
 * Note: This is a simplified implementation
 * For production, use the 'punycode' npm package
 */
export function toPunycode(unicode: string): string {
  // Check if already ASCII
  if (/^[\x00-\x7F]+$/.test(unicode)) {
    return unicode.toLowerCase();
  }

  // For production, use: return punycode.toASCII(unicode);
  // This is a placeholder that marks non-ASCII domains
  console.warn('Punycode conversion not fully implemented, using placeholder');
  return PREFIX + 'placeholder-' + Buffer.from(unicode).toString('base64').toLowerCase();
}

/**
 * Convert Punycode to Unicode
 * Note: This is a simplified implementation
 * For production, use the 'punycode' npm package
 */
export function toUnicode(punycode: string): string {
  if (!isPunycode(punycode)) {
    return punycode.toLowerCase();
  }

  // For production, use: return punycode.toUnicode(punycode);
  // This is a placeholder
  console.warn('Punycode conversion not fully implemented, using placeholder');
  return punycode.slice(PREFIX.length);
}

/**
 * Normalize a domain name (handles IDN conversion)
 */
export function normalizeDomain(name: string): {
  original: string;
  unicode: string;
  punycode: string;
  normalized: string;
} {
  const lower = name.toLowerCase().trim();

  // Remove trailing dot if present
  const clean = lower.replace(/\.$/, '');

  let unicode: string;
  let punycode: string;

  if (isPunycode(clean)) {
    punycode = clean;
    unicode = toUnicode(clean);
  } else if (/^[\x00-\x7F]+$/.test(clean)) {
    // ASCII domain
    unicode = clean;
    punycode = clean;
  } else {
    // Unicode domain - convert to punycode
    unicode = clean;
    punycode = toPunycode(clean);
  }

  return {
    original: name,
    unicode,
    punycode,
    normalized: punycode,
  };
}

/**
 * Validate domain name format
 */
export function isValidDomain(name: string): boolean {
  if (!name || name.length > 253) {
    return false;
  }

  // Remove trailing dot for validation
  const clean = name.replace(/\.$/, '');

  // Check each label
  const labels = clean.split('.');
  for (const label of labels) {
    if (label.length === 0 || label.length > 63) {
      return false;
    }

    // Labels can contain letters, digits, and hyphens
    // But cannot start or end with hyphens
    if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(label)) {
      // Allow punycode prefix
      if (!label.startsWith(PREFIX)) {
        return false;
      }
    }
  }

  return true;
}
