/**
 * DNS Ops Workbench - Parsing Package
 *
 * Utilities for parsing DNS responses, mail records (SPF, DMARC, DKIM),
 * and formatting in dig-style output.
 */
export * from './diff/index.js';
export * from './dig/index.js';
export { getWildcardBase, isWildcard, normalizeDomain as normalizeDNSDomain, type ParsedAnswer, parseDNSAnswer, parseTXTRecord, } from './dns/index.js';
export * from './dns/recordset.js';
export { fromPunycode, isPunycode, isValidDomain, normalizeDomain, toPunycode, } from './idn/index.js';
export * from './mail/index.js';
//# sourceMappingURL=index.d.ts.map