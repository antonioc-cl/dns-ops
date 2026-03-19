/**
 * DKIM Selector Discovery Module
 *
 * Implements the 5-level precedence strategy:
 * 1. Managed zone configured selectors
 * 2. Operator-supplied selectors
 * 3. Provider-specific heuristics
 * 4. Common selector dictionary
 * 5. No selector found → partial
 */
// Common DKIM selectors used across many providers
export const COMMON_SELECTORS = [
    'default',
    'dkim',
    'mail',
    'email',
    'selector1',
    'selector2',
    'google',
    'k1',
    's1',
    's2',
];
// Provider-specific selector patterns
const PROVIDER_SELECTORS = {
    'google-workspace': ['google', '20210112', '20230601', '2024'],
    'microsoft-365': ['selector1', 'selector2', 'microsoft'],
    'amazon-ses': ['amazonses', 'aws'],
    'sendgrid': ['smtpapi', 'sendgrid'],
    'mailgun': ['mailgun', 'krs'],
};
// Provider detection patterns from MX records
const PROVIDER_MX_PATTERNS = {
    'google-workspace': [
        /google\.com$/,
        /googlemail\.com$/,
    ],
    'microsoft-365': [
        /outlook\.com$/,
        /hotmail\.com$/,
        /microsoft$/,
    ],
    'amazon-ses': [
        /amazonses\.com$/,
    ],
};
// Provider detection patterns from SPF records
const PROVIDER_SPF_PATTERNS = {
    'google-workspace': [
        /_spf\.google\.com/,
        /google\.com/,
    ],
    'microsoft-365': [
        /spf\.protection\.outlook\.com/,
        /outlook\.com/,
    ],
    'amazon-ses': [
        /amazonses\.com/,
    ],
};
/**
 * Detect mail provider from DNS query results
 */
export function detectProvider(results) {
    for (const result of results) {
        if (!result.success)
            continue;
        // Check MX records
        if (result.query.type === 'MX') {
            for (const answer of result.answers) {
                const mxHost = answer.data.toLowerCase();
                for (const [provider, patterns] of Object.entries(PROVIDER_MX_PATTERNS)) {
                    if (patterns.some((pattern) => pattern.test(mxHost))) {
                        return provider;
                    }
                }
            }
        }
        // Check SPF TXT records
        if (result.query.type === 'TXT') {
            for (const answer of result.answers) {
                const txtData = answer.data.toLowerCase();
                if (txtData.includes('v=spf1')) {
                    for (const [provider, patterns] of Object.entries(PROVIDER_SPF_PATTERNS)) {
                        if (patterns.some((pattern) => pattern.test(txtData))) {
                            return provider;
                        }
                    }
                }
            }
        }
    }
    return 'unknown';
}
/**
 * Get known selectors for a provider
 */
export function getProviderSelectors(provider) {
    return PROVIDER_SELECTORS[provider] || [];
}
/**
 * Validate a DKIM selector format
 */
function isValidSelector(selector) {
    // Selectors must be alphanumeric with hyphens/underscores
    // Cannot be empty, cannot contain spaces
    if (!selector || selector.length === 0)
        return false;
    if (selector.length > 63)
        return false; // DNS label limit
    return /^[a-zA-Z0-9_-]+$/.test(selector);
}
/**
 * Main selector discovery function
 * Implements 5-level precedence strategy
 */
export async function discoverSelectors(_domain, dnsResults, config = {}) {
    const { managedSelectors = [], operatorSelectors = [], skipDictionary = false, maxSelectors = 10, } = config;
    const attempts = [];
    let selectors = [];
    let provenance = 'not-found';
    let confidence = 'heuristic';
    let detectedProvider;
    // Level 1: Managed zone configured selectors (highest precedence)
    if (managedSelectors.length > 0) {
        selectors = managedSelectors.filter(isValidSelector).slice(0, maxSelectors);
        if (selectors.length > 0) {
            provenance = 'managed-zone-config';
            confidence = 'certain';
            selectors.forEach((s) => attempts.push({ selector: s, found: true, source: provenance }));
            return { selectors, provenance, confidence, attempts };
        }
    }
    // Level 2: Operator-supplied selectors
    if (operatorSelectors.length > 0) {
        selectors = operatorSelectors.filter(isValidSelector).slice(0, maxSelectors);
        if (selectors.length > 0) {
            provenance = 'operator-supplied';
            confidence = 'high';
            selectors.forEach((s) => attempts.push({ selector: s, found: true, source: provenance }));
            return { selectors, provenance, confidence, attempts };
        }
    }
    // Level 3: Provider-specific heuristics
    detectedProvider = detectProvider(dnsResults);
    if (detectedProvider !== 'unknown') {
        const providerSelectors = getProviderSelectors(detectedProvider);
        // In a real implementation, we would validate these selectors exist
        // by querying DNS. For now, we return them as candidates.
        selectors = providerSelectors.slice(0, maxSelectors);
        if (selectors.length > 0) {
            provenance = 'provider-heuristic';
            confidence = 'medium';
            selectors.forEach((s) => attempts.push({ selector: s, found: true, source: provenance }));
            return {
                selectors,
                provenance,
                confidence,
                provider: detectedProvider,
                attempts,
            };
        }
    }
    // Level 4: Common selector dictionary
    if (!skipDictionary) {
        selectors = COMMON_SELECTORS.slice(0, maxSelectors);
        provenance = 'common-dictionary';
        confidence = 'low';
        selectors.forEach((s) => attempts.push({ selector: s, found: true, source: provenance }));
        return { selectors, provenance, confidence, attempts };
    }
    // Level 5: No selector found
    return {
        selectors: [],
        provenance: 'not-found',
        confidence: 'heuristic',
        attempts,
    };
}
/**
 * Build DKIM query names from selectors
 */
export function buildDkimQueryNames(domain, selectors) {
    return selectors.map((selector) => ({
        name: `${selector}._domainkey.${domain}`,
        type: 'TXT',
    }));
}
/**
 * Check if a DNS result indicates Null MX
 */
export function isNullMx(result) {
    if (result.query.type !== 'MX' || !result.success)
        return false;
    if (result.answers.length !== 1)
        return false;
    const mxData = result.answers[0].data;
    // Null MX pattern: priority 0 with root dot (0 .)
    return /^0\s+\.$/.test(mxData.trim());
}
/**
 * Parse SPF record from TXT query result
 */
export function parseSpfRecord(result) {
    if (result.query.type !== 'TXT' || !result.success)
        return null;
    for (const answer of result.answers) {
        if (answer.data.includes('v=spf1')) {
            return answer.data;
        }
    }
    return null;
}
/**
 * Check if TXT record is a DMARC record
 */
export function isDmarcRecord(result) {
    if (result.query.type !== 'TXT' || !result.success)
        return false;
    return result.answers.some((answer) => answer.data.includes('v=DMARC1'));
}
/**
 * Check if TXT record is an MTA-STS record
 */
export function isMtaStsRecord(result) {
    if (result.query.type !== 'TXT' || !result.success)
        return false;
    if (!result.query.name.includes('_mta-sts'))
        return false;
    return result.answers.some((answer) => answer.data.includes('v=STSv1'));
}
//# sourceMappingURL=selector-discovery.js.map