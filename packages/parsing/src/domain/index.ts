/**
 * Domain Normalization Utilities
 *
 * Canonical domain normalization implementation for DNS Ops Workbench.
 * All domain normalization MUST go through this module to ensure consistency.
 *
 * Handles:
 * - ASCII lowercase conversion
 * - Trailing dot stripping
 * - IDN/punycode round-trip conversion
 * - Whitespace trimming
 * - Validation (length, characters, format)
 */

import punycode from 'punycode/punycode.js';

const { toASCII, toUnicode } = punycode;

const PREFIX = 'xn--';

/**
 * Error thrown when domain normalization fails
 */
export class DomainNormalizationError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'EMPTY_DOMAIN'
      | 'DOMAIN_TOO_LONG'
      | 'LABEL_TOO_LONG'
      | 'INVALID_CHARACTERS'
      | 'INVALID_FORMAT'
      | 'DOUBLE_DOT'
  ) {
    super(message);
    this.name = 'DomainNormalizationError';
  }
}

/**
 * Check if a domain name is punycode encoded
 */
export function isPunycode(name: string): boolean {
  return name.startsWith(PREFIX);
}

/**
 * Validate domain name format without throwing
 * Handles both ASCII and Unicode domains
 */
export function isValidDomain(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }

  if (name.length > 253) {
    return false;
  }

  // Remove trailing dot for validation
  const clean = name.replace(/\.$/, '');

  if (clean.length === 0) {
    return false;
  }

  // Check for double dots
  if (clean.includes('..')) {
    return false;
  }

  // Check each label
  const labels = clean.split('.');
  for (const label of labels) {
    if (label.length === 0 || label.length > 63) {
      return false;
    }

    // Check for leading/trailing hyphen
    if (label.startsWith('-') || label.endsWith('-')) {
      return false;
    }

    // Try to convert to punycode first (handles unicode)
    try {
      const asciiLabel = toASCII(label);
      // Validate the ASCII representation
      // Label must start with alphanumeric, can contain hyphens, end with alphanumeric
      if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i.test(asciiLabel)) {
        // Allow punycode prefix
        if (!asciiLabel.startsWith(PREFIX)) {
          return false;
        }
      }
    } catch {
      // If conversion fails, check if it's valid ASCII
      if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i.test(label)) {
        if (!label.startsWith(PREFIX)) {
          return false;
        }
      }
    }
  }

  return true;
}

/**
 * Result of domain normalization
 */
export interface NormalizedDomain {
  /** Original input domain */
  original: string;
  /** Unicode representation (for display) */
  unicode: string;
  /** Punycode/ASCII representation (for DNS queries) */
  punycode: string;
  /** Canonical normalized form (same as punycode) */
  normalized: string;
}

/**
 * Normalize a domain name to canonical form
 *
 * Applies the following transformations:
 * 1. Trim whitespace
 * 2. Convert to lowercase
 * 3. Strip trailing dot (root zone indicator)
 * 4. Convert Unicode/IDN to punycode
 *
 * @throws DomainNormalizationError if domain is invalid
 */
export function normalizeDomain(name: string): NormalizedDomain {
  // Basic input validation
  if (!name || typeof name !== 'string') {
    throw new DomainNormalizationError('Domain name is required', 'EMPTY_DOMAIN');
  }

  // Trim whitespace first
  const trimmed = name.trim();

  if (trimmed.length === 0) {
    throw new DomainNormalizationError('Domain name cannot be empty', 'EMPTY_DOMAIN');
  }

  // Check overall length (max 253 characters per RFC 1035)
  if (trimmed.length > 253) {
    throw new DomainNormalizationError(
      `Domain name exceeds maximum length of 253 characters`,
      'DOMAIN_TOO_LONG'
    );
  }

  // Convert to lowercase and strip trailing dot
  const lower = trimmed.toLowerCase();
  const clean = lower.replace(/\.$/, '');

  // Check for double dots (invalid format)
  if (clean.includes('..')) {
    throw new DomainNormalizationError('Domain contains consecutive dots', 'DOUBLE_DOT');
  }

  // Process each label
  const labels = clean.split('.');
  const normalizedLabels: string[] = [];
  const unicodeLabels: string[] = [];

  for (const label of labels) {
    // Check label length (max 63 characters per RFC 1035)
    if (label.length === 0) {
      throw new DomainNormalizationError('Domain contains empty label', 'INVALID_FORMAT');
    }

    if (label.length > 63) {
      throw new DomainNormalizationError(
        `Label "${label.substring(0, 20)}..." exceeds maximum length of 63 characters`,
        'LABEL_TOO_LONG'
      );
    }

    // Check for leading/trailing hyphen
    if (label.startsWith('-')) {
      throw new DomainNormalizationError(`Label "${label}" starts with hyphen`, 'INVALID_FORMAT');
    }

    if (label.endsWith('-')) {
      throw new DomainNormalizationError(`Label "${label}" ends with hyphen`, 'INVALID_FORMAT');
    }

    // Check for invalid characters and spaces
    if (label.includes(' ')) {
      throw new DomainNormalizationError(`Label "${label}" contains spaces`, 'INVALID_CHARACTERS');
    }

    // Process the label
    let normalizedLabel: string;
    let unicodeLabel: string;

    if (isPunycode(label)) {
      // Already punycode - validate and decode
      normalizedLabel = label;
      try {
        unicodeLabel = toUnicode(label);
      } catch {
        unicodeLabel = label;
      }
    } else {
      // biome-ignore lint/suspicious/noControlCharactersInRegex: Intentional ASCII check
      const isAscii = /^[\x00-\x7F]+$/.test(label);

      if (isAscii) {
        // Validate ASCII label
        if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i.test(label)) {
          throw new DomainNormalizationError(
            `Label "${label}" contains invalid characters`,
            'INVALID_CHARACTERS'
          );
        }
        normalizedLabel = label;
        unicodeLabel = label;
      } else {
        // Unicode/IDN - convert to punycode
        try {
          normalizedLabel = toASCII(label);
          unicodeLabel = label;
        } catch (err) {
          throw new DomainNormalizationError(
            `Failed to convert label "${label}" to punycode: ${err instanceof Error ? err.message : String(err)}`,
            'INVALID_CHARACTERS'
          );
        }
      }
    }

    normalizedLabels.push(normalizedLabel);
    unicodeLabels.push(unicodeLabel);
  }

  const punycodeResult = normalizedLabels.join('.');
  const unicodeResult = unicodeLabels.join('.');

  return {
    original: name,
    unicode: unicodeResult,
    punycode: punycodeResult,
    normalized: punycodeResult,
  };
}

/**
 * Normalize a domain name, returning null on error instead of throwing
 */
export function tryNormalizeDomain(name: string): NormalizedDomain | null {
  try {
    return normalizeDomain(name);
  } catch {
    return null;
  }
}
