/**
 * IDN (Internationalized Domain Name) Utilities
 *
 * Handle punycode encoding/decoding for international domain names.
 * Uses the 'punycode' package for proper RFC 3492 implementation.
 */

import { toASCII, toUnicode } from 'punycode/';

const PREFIX = 'xn--';

/**
 * Check if a domain name is punycode encoded
 */
export function isPunycode(name: string): boolean {
  return name.startsWith(PREFIX);
}

/**
 * Convert Unicode domain to Punycode (ASCII)
 * Uses proper RFC 3492 implementation via the punycode package
 */
export function toPunycode(unicode: string): string {
  // Check if already ASCII
  // biome-ignore lint/suspicious/noControlCharactersInRegex: Intentional ASCII check
  if (/^[\x00-\x7F]+$/.test(unicode)) {
    return unicode.toLowerCase();
  }

  // Use proper punycode conversion
  return toASCII(unicode.toLowerCase());
}

/**
 * Convert Punycode to Unicode
 * Uses proper RFC 3492 implementation via the punycode package
 */
export function fromPunycode(punycode: string): string {
  if (!isPunycode(punycode)) {
    return punycode.toLowerCase();
  }

  // Use proper punycode conversion
  return toUnicode(punycode);
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
    unicode = fromPunycode(clean);
    // biome-ignore lint/suspicious/noControlCharactersInRegex: Intentional ASCII check
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
 * Handles both ASCII and Unicode domains
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

    // Try to convert to punycode first (handles unicode)
    try {
      const asciiLabel = toASCII(label);
      // Validate the ASCII representation
      if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(asciiLabel)) {
        // Allow punycode prefix
        if (!asciiLabel.startsWith(PREFIX)) {
          return false;
        }
      }
    } catch {
      // If conversion fails, check if it's valid ASCII
      if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(label)) {
        if (!label.startsWith(PREFIX)) {
          return false;
        }
      }
    }
  }

  return true;
}
