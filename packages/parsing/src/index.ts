/**
 * DNS Ops Workbench - Parsing Package
 *
 * Utilities for parsing DNS responses, mail records (SPF, DMARC, DKIM),
 * and formatting in dig-style output.
 */

export * from './diff/index.js';
export * from './dig/index.js';
// DNS exports (excluding normalizeDomain to avoid conflict with domain)
export {
  getWildcardBase,
  isWildcard,
  normalizeDomain as normalizeDNSDomain,
  type ParsedAnswer,
  parseDNSAnswer,
  parseTXTRecord,
} from './dns/index.js';
export * from './dns/recordset.js';

// Domain exports - CANONICAL domain normalization
export {
  DomainNormalizationError,
  isPunycode,
  isValidDomain,
  type NormalizedDomain,
  normalizeDomain,
  tryNormalizeDomain,
} from './domain/index.js';

// IDN exports (re-exported from domain for backward compatibility)
export {
  fromPunycode,
  toPunycode,
} from './idn/index.js';
export * from './mail/index.js';
