/**
 * DNS Resolution utilities for mail checking
 */

import { resolveMx, resolveTxt } from 'node:dns/promises';

/**
 * Resolve TXT records for a hostname
 */
export async function resolveTXT(hostname: string): Promise<string[]> {
  const records = await resolveTxt(hostname);
  // Join multi-part TXT records
  return records.map((parts) => parts.join(''));
}

/**
 * MX record structure
 */
export interface MxRecord {
  exchange: string;
  priority: number;
}

/**
 * Resolve MX records for a domain
 */
export async function resolveMX(domain: string): Promise<MxRecord[]> {
  const records = await resolveMx(domain);
  return records.map((r) => ({
    exchange: r.exchange,
    priority: r.priority,
  }));
}
