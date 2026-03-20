/**
 * Mail Checker
 *
 * Performs DMARC, DKIM, and SPF checks for email security validation.
 */
import { parseDMARC, parseSPF } from '@dns-ops/parsing';
import { resolveTXT } from './dns.js';
// Provider selector mapping with confidence scores
export const PROVIDER_SELECTORS = {
    google: { selector: 'google', confidence: 0.95 },
    'google-workspace': { selector: 'google', confidence: 0.95 },
    microsoft: { selector: 'selector1', confidence: 0.9 },
    'microsoft-365': { selector: 'selector1', confidence: 0.9 },
    outlook: { selector: 'selector1', confidence: 0.9 },
    zoho: { selector: 'zoho', confidence: 0.95 },
    default: { selector: 'default', confidence: 0.3 },
};
// Common DKIM selectors to try as fallback
export const COMMON_SELECTORS = ['default', 'dkim', 'mail', 'email'];
/**
 * Perform complete mail check (DMARC, DKIM, SPF)
 */
export async function performMailCheck(domain, options) {
    const [dmarc, dkim, spf] = await Promise.all([
        checkDMARC(domain),
        checkDKIM(domain, options),
        checkSPF(domain),
    ]);
    return {
        domain,
        dmarc,
        dkim,
        spf,
        checkedAt: new Date(),
    };
}
/**
 * Check DMARC record
 */
export async function checkDMARC(domain) {
    try {
        const records = await resolveTXT(`_dmarc.${domain}`);
        const dmarcRecord = records.find((r) => r.includes('v=DMARC1'));
        if (!dmarcRecord) {
            return {
                present: false,
                valid: false,
                errors: ['No DMARC record found'],
            };
        }
        const parsed = parseDMARC(dmarcRecord);
        return {
            present: true,
            valid: parsed !== null,
            record: dmarcRecord,
            parsed: parsed || undefined,
            errors: parsed ? undefined : ['Failed to parse DMARC record'],
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            present: false,
            valid: false,
            errors: [`DNS error: ${message}`],
        };
    }
}
/**
 * Check DKIM record with selector discovery
 */
export async function checkDKIM(domain, options) {
    const triedSelectors = [];
    // Priority 1: Explicit selectors from operator
    if (options?.explicitSelectors?.length) {
        for (const selector of options.explicitSelectors) {
            triedSelectors.push(selector);
            const result = await tryDKIMSelector(domain, selector);
            if (result.present) {
                return {
                    ...result,
                    selectorProvenance: 'operator',
                    triedSelectors: [...triedSelectors],
                };
            }
        }
    }
    // Priority 2: Provider heuristic
    if (options?.preferredProvider) {
        const provider = PROVIDER_SELECTORS[options.preferredProvider];
        if (provider) {
            triedSelectors.push(provider.selector);
            const result = await tryDKIMSelector(domain, provider.selector);
            if (result.present) {
                return {
                    ...result,
                    selectorProvenance: 'heuristic',
                    triedSelectors: [...triedSelectors],
                };
            }
        }
    }
    // Priority 3: Common selector dictionary
    for (const selector of COMMON_SELECTORS) {
        if (!triedSelectors.includes(selector)) {
            triedSelectors.push(selector);
            const result = await tryDKIMSelector(domain, selector);
            if (result.present) {
                return {
                    ...result,
                    selectorProvenance: 'default',
                    triedSelectors: [...triedSelectors],
                };
            }
        }
    }
    return {
        present: false,
        valid: false,
        selectorProvenance: 'default',
        triedSelectors: [...triedSelectors],
        errors: [`No DKIM record found. Tried selectors: ${triedSelectors.join(', ')}`],
    };
}
/**
 * Try a specific DKIM selector
 */
async function tryDKIMSelector(domain, selector) {
    try {
        const records = await resolveTXT(`${selector}._domainkey.${domain}`);
        const dkimRecord = records[0];
        // Basic validation: should contain v=DKIM1 or k= (key type)
        const valid = dkimRecord.includes('v=DKIM1') || dkimRecord.includes('k=');
        return {
            present: true,
            valid,
            record: dkimRecord,
        };
    }
    catch (_error) {
        return {
            present: false,
            valid: false,
        };
    }
}
/**
 * Check SPF record
 */
export async function checkSPF(domain) {
    try {
        const records = await resolveTXT(domain);
        const spfRecord = records.find((r) => r.startsWith('v=spf1'));
        if (!spfRecord) {
            return {
                present: false,
                valid: false,
                errors: ['No SPF record found'],
            };
        }
        const parsed = parseSPF(spfRecord);
        return {
            present: true,
            valid: parsed !== null,
            record: spfRecord,
            parsed: parsed || undefined,
            errors: parsed ? undefined : ['Failed to parse SPF record'],
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            present: false,
            valid: false,
            errors: [`DNS error: ${message}`],
        };
    }
}
//# sourceMappingURL=checker.js.map