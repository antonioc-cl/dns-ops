/**
 * DNS Ops Workbench - Parsing Package
 *
 * Utilities for parsing DNS responses, mail records (SPF, DMARC, DKIM),
 * and formatting in dig-style output.
 */

export * from './dns/index';
export * from './dns/recordset';
export * from './dig/format';
export * from './mail/index';
export * from './idn/index';
