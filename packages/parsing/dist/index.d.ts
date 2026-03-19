/**
 * DNS Ops Workbench - Parsing Package
 *
 * Utilities for parsing DNS responses, mail records (SPF, DMARC, DKIM),
 * and formatting in dig-style output.
 */
export { type ParsedAnswer, parseDNSAnswer, parseTXTRecord, normalizeDomain as normalizeDNSDomain, isWildcard, getWildcardBase, } from './dns/index.js';
export * from './dns/recordset.js';
export * from './dig/index.js';
export * from './mail/index.js';
export { isPunycode, toPunycode, toUnicode, normalizeDomain, isValidDomain, } from './idn/index.js';
export * from './diff/index.js';
//# sourceMappingURL=index.d.ts.map