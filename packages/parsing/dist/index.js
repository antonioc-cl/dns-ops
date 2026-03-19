/**
 * DNS Ops Workbench - Parsing Package
 *
 * Utilities for parsing DNS responses, mail records (SPF, DMARC, DKIM),
 * and formatting in dig-style output.
 */
// DNS exports (excluding normalizeDomain to avoid conflict with idn)
export { parseDNSAnswer, parseTXTRecord, normalizeDomain as normalizeDNSDomain, isWildcard, getWildcardBase, } from './dns/index.js';
export * from './dns/recordset.js';
export * from './dig/index.js';
export * from './mail/index.js';
// IDN exports
export { isPunycode, toPunycode, toUnicode, normalizeDomain, isValidDomain, } from './idn/index.js';
export * from './diff/index.js';
//# sourceMappingURL=index.js.map