/**
 * DNS Ops Workbench - Parsing Package
 *
 * Utilities for parsing DNS responses, mail records (SPF, DMARC, DKIM),
 * and formatting in dig-style output.
 */
export * from './diff/index.js';
export * from './dig/index.js';
// DNS exports (excluding normalizeDomain to avoid conflict with idn)
export { getWildcardBase, isWildcard, normalizeDomain as normalizeDNSDomain, parseDNSAnswer, parseTXTRecord, } from './dns/index.js';
export * from './dns/recordset.js';
// IDN exports
export { isPunycode, isValidDomain, normalizeDomain, toPunycode, toUnicode, } from './idn/index.js';
export * from './mail/index.js';
//# sourceMappingURL=index.js.map