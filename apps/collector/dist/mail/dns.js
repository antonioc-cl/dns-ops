/**
 * DNS Resolution utilities for mail checking
 */
import { resolveTxt } from 'dns/promises';
/**
 * Resolve TXT records for a hostname
 */
export async function resolveTXT(hostname) {
    const records = await resolveTxt(hostname);
    // Join multi-part TXT records
    return records.map(parts => parts.join(''));
}
//# sourceMappingURL=dns.js.map