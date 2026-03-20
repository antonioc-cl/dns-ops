/**
 * Provider Templates - Bead 09
 *
 * Narrow provider-template pack for top providers.
 * Data-backed template storage for expected configurations.
 */
// =============================================================================
// Provider Template Definitions
// =============================================================================
export const PROVIDER_TEMPLATES = {
    'google-workspace': {
        id: 'template.google-workspace.v1',
        provider: 'google-workspace',
        name: 'Google Workspace',
        description: 'Expected configuration for Google Workspace email hosting',
        version: '1.0.0',
        expected: {
            mx: [
                { priority: 1, pattern: /\.googlemail\.com$/i, description: 'Google Workspace MX' },
                { priority: 5, pattern: /\.googlemail\.com$/i, description: 'Google Workspace MX backup' },
            ],
            spf: {
                required: true,
                include: '_spf.google.com',
                patterns: [/_spf\.google\.com/, /include:.*google/],
            },
            dmarc: {
                required: true,
                recommendedPolicy: 'quarantine',
            },
            dkim: {
                required: true,
                selectors: ['google', '20210112', '20230601'],
            },
            mtaSts: false, // Optional
            tlsRpt: false, // Optional
        },
        knownSelectors: ['google', '20210112', '20230601', '2024'],
        detection: {
            mxPatterns: [/googlemail\.com$/i, /\.google\.com$/i],
            spfPatterns: [/_spf\.google\.com/i, /google\.com/i],
        },
    },
    'microsoft-365': {
        id: 'template.microsoft-365.v1',
        provider: 'microsoft-365',
        name: 'Microsoft 365',
        description: 'Expected configuration for Microsoft 365 email hosting',
        version: '1.0.0',
        expected: {
            mx: [
                {
                    priority: 0,
                    pattern: /\.mail\.protection\.outlook\.com$/i,
                    description: 'Microsoft 365 MX',
                },
            ],
            spf: {
                required: true,
                include: 'spf.protection.outlook.com',
                patterns: [/spf\.protection\.outlook\.com/i, /outlook\.com/i],
            },
            dmarc: {
                required: true,
                recommendedPolicy: 'quarantine',
            },
            dkim: {
                required: true,
                selectors: ['selector1', 'selector2'],
            },
            mtaSts: false,
            tlsRpt: false,
        },
        knownSelectors: ['selector1', 'selector2', 'microsoft'],
        detection: {
            mxPatterns: [/\.mail\.protection\.outlook\.com$/i, /outlook\.com$/i, /hotmail\.com$/i],
            spfPatterns: [/spf\.protection\.outlook\.com/i, /outlook\.com/i],
        },
    },
    'amazon-ses': {
        id: 'template.amazon-ses.v1',
        provider: 'amazon-ses',
        name: 'Amazon SES',
        description: 'Expected configuration for Amazon Simple Email Service',
        version: '1.0.0',
        expected: {
            mx: [], // SES is typically outbound only
            spf: {
                required: false,
                include: 'amazonses.com',
                patterns: [/amazonses\.com/i],
            },
            dmarc: {
                required: false,
                recommendedPolicy: 'none',
            },
            dkim: {
                required: true,
                selectors: ['amazonses'],
            },
            mtaSts: false,
            tlsRpt: false,
        },
        knownSelectors: ['amazonses', 'aws'],
        detection: {
            mxPatterns: [/amazonses\.com$/i],
            spfPatterns: [/amazonses\.com/i],
        },
    },
    sendgrid: {
        id: 'template.sendgrid.v1',
        provider: 'sendgrid',
        name: 'SendGrid',
        description: 'Expected configuration for SendGrid email delivery',
        version: '1.0.0',
        expected: {
            mx: [],
            spf: {
                required: false,
                include: 'sendgrid.net',
                patterns: [/sendgrid\.net/i],
            },
            dmarc: {
                required: false,
                recommendedPolicy: 'none',
            },
            dkim: {
                required: true,
                selectors: ['smtpapi'],
            },
            mtaSts: false,
            tlsRpt: false,
        },
        knownSelectors: ['smtpapi', 'sendgrid'],
        detection: {
            mxPatterns: [/sendgrid\.(net|com)$/i],
            spfPatterns: [/sendgrid\.net/i],
        },
    },
    mailgun: {
        id: 'template.mailgun.v1',
        provider: 'mailgun',
        name: 'Mailgun',
        description: 'Expected configuration for Mailgun email delivery',
        version: '1.0.0',
        expected: {
            mx: [{ priority: 10, pattern: /\.mailgun\.(org|net)$/i, description: 'Mailgun MX' }],
            spf: {
                required: true,
                include: 'mailgun.org',
                patterns: [/mailgun\.(org|net)/i],
            },
            dmarc: {
                required: false,
                recommendedPolicy: 'none',
            },
            dkim: {
                required: true,
                selectors: ['krs', 'mailgun'],
            },
            mtaSts: false,
            tlsRpt: false,
        },
        knownSelectors: ['krs', 'mailgun', 'mg'],
        detection: {
            mxPatterns: [/\.mailgun\.(org|net)$/i],
            spfPatterns: [/mailgun\.(org|net)/i],
        },
    },
    other: {
        id: 'template.other.v1',
        provider: 'other',
        name: 'Other Provider',
        description: 'Generic template for unidentified mail providers',
        version: '1.0.0',
        expected: {
            mx: [],
            spf: {
                required: true,
                patterns: [/v=spf1/],
            },
            dmarc: {
                required: true,
                recommendedPolicy: 'none',
            },
            dkim: {
                required: false,
                selectors: [],
            },
            mtaSts: false,
            tlsRpt: false,
        },
        knownSelectors: ['default', 'dkim', 'mail'],
        detection: {
            mxPatterns: [],
            spfPatterns: [],
        },
    },
    unknown: {
        id: 'template.unknown.v1',
        provider: 'unknown',
        name: 'Unknown Provider',
        description: 'No provider detected - minimal expectations',
        version: '1.0.0',
        expected: {
            mx: [],
            spf: {
                required: false,
                patterns: [],
            },
            dmarc: {
                required: false,
                recommendedPolicy: 'none',
            },
            dkim: {
                required: false,
                selectors: [],
            },
            mtaSts: false,
            tlsRpt: false,
        },
        knownSelectors: [],
        detection: {
            mxPatterns: [],
            spfPatterns: [],
        },
    },
};
export function detectProviderFromDns(mxRecords, spfRecord) {
    const scores = {
        'google-workspace': 0,
        'microsoft-365': 0,
        'amazon-ses': 0,
        sendgrid: 0,
        mailgun: 0,
        other: 0,
        unknown: 0,
    };
    const evidence = {
        'google-workspace': [],
        'microsoft-365': [],
        'amazon-ses': [],
        sendgrid: [],
        mailgun: [],
        other: [],
        unknown: [],
    };
    // Score based on MX records
    for (const mx of mxRecords) {
        const mxLower = mx.toLowerCase();
        for (const [provider, template] of Object.entries(PROVIDER_TEMPLATES)) {
            for (const pattern of template.detection.mxPatterns) {
                if (pattern.test(mxLower)) {
                    scores[provider] += 2;
                    evidence[provider].push(`MX match: ${mx}`);
                }
            }
        }
    }
    // Score based on SPF
    if (spfRecord) {
        const spfLower = spfRecord.toLowerCase();
        for (const [provider, template] of Object.entries(PROVIDER_TEMPLATES)) {
            for (const pattern of template.detection.spfPatterns) {
                if (pattern.test(spfLower)) {
                    scores[provider] += 1;
                    evidence[provider].push(`SPF match: ${pattern.source}`);
                }
            }
        }
    }
    // Find highest scoring provider
    let bestProvider = 'unknown';
    let bestScore = 0;
    for (const [provider, score] of Object.entries(scores)) {
        if (score > bestScore) {
            bestScore = score;
            bestProvider = provider;
        }
    }
    // Determine confidence
    let confidence = 'low';
    if (bestScore >= 3)
        confidence = 'certain';
    else if (bestScore >= 2)
        confidence = 'high';
    else if (bestScore >= 1)
        confidence = 'medium';
    return {
        provider: bestProvider,
        confidence,
        evidence: evidence[bestProvider],
    };
}
export function compareToTemplate(provider, actual) {
    const template = PROVIDER_TEMPLATES[provider];
    const matches = [];
    const mismatches = [];
    const missing = [];
    // Compare MX
    if (template.expected.mx && template.expected.mx.length > 0) {
        if (!actual.mx || actual.mx.length === 0) {
            missing.push({
                aspect: 'MX',
                expected: template.expected.mx.map((m) => m.description).join(', '),
                severity: 'critical',
            });
        }
        else {
            const mxMatch = template.expected.mx.some((expected) => actual.mx?.some((mx) => expected.pattern.test(mx)));
            if (mxMatch) {
                matches.push({
                    aspect: 'MX',
                    expected: 'Provider-specific MX',
                    actual: actual.mx.join(', '),
                    matches: true,
                });
            }
            else {
                mismatches.push({
                    aspect: 'MX',
                    expected: template.expected.mx.map((m) => m.description).join(', '),
                    actual: actual.mx.join(', '),
                    severity: 'high',
                });
            }
        }
    }
    // Compare SPF
    if (template.expected.spf?.required) {
        if (!actual.spf) {
            missing.push({
                aspect: 'SPF',
                expected: `Include: ${template.expected.spf.include || 'provider SPF'}`,
                severity: 'high',
            });
        }
        else {
            const spfMatch = template.expected.spf.patterns.some((pattern) => pattern.test(actual.spf));
            if (spfMatch) {
                matches.push({
                    aspect: 'SPF',
                    expected: 'Provider SPF pattern',
                    actual: 'SPF configured',
                    matches: true,
                });
            }
            else {
                mismatches.push({
                    aspect: 'SPF',
                    expected: `Include ${template.expected.spf.include || 'provider SPF'}`,
                    actual: actual.spf,
                    severity: 'medium',
                });
            }
        }
    }
    // Compare DKIM selectors
    if (template.expected.dkim?.required) {
        const expectedSelectors = template.expected.dkim.selectors;
        if (!actual.dkimSelectors || actual.dkimSelectors.length === 0) {
            missing.push({
                aspect: 'DKIM',
                expected: `Selectors: ${expectedSelectors.join(', ')}`,
                severity: 'high',
            });
        }
        else {
            const foundSelectors = actual.dkimSelectors.filter((s) => expectedSelectors.includes(s));
            if (foundSelectors.length > 0) {
                matches.push({
                    aspect: 'DKIM',
                    expected: `Known selectors: ${expectedSelectors.join(', ')}`,
                    actual: `Found: ${foundSelectors.join(', ')}`,
                    matches: true,
                });
            }
            else {
                mismatches.push({
                    aspect: 'DKIM',
                    expected: `Selectors: ${expectedSelectors.join(', ')}`,
                    actual: `Found: ${actual.dkimSelectors.join(', ')}`,
                    severity: 'medium',
                });
            }
        }
    }
    // Determine overall match
    let overallMatch;
    if (mismatches.length === 0 && missing.length === 0) {
        overallMatch = 'full';
    }
    else if (matches.length > 0) {
        overallMatch = 'partial';
    }
    else {
        overallMatch = 'none';
    }
    return {
        provider,
        matches,
        mismatches,
        missing,
        overallMatch,
    };
}
// In-memory implementation (to be replaced with database-backed storage)
class InMemoryTemplateStorage {
    templates;
    constructor() {
        this.templates = new Map(Object.entries(PROVIDER_TEMPLATES));
    }
    getTemplate(provider) {
        return this.templates.get(provider);
    }
    getAllTemplates() {
        return Array.from(this.templates.values());
    }
    updateTemplate(template) {
        this.templates.set(template.provider, template);
    }
    addCustomSelector(provider, selector) {
        const template = this.templates.get(provider);
        if (template && !template.knownSelectors.includes(selector)) {
            template.knownSelectors.push(selector);
            template.expected.dkim?.selectors.push(selector);
        }
    }
}
export const templateStorage = new InMemoryTemplateStorage();
//# sourceMappingURL=templates.js.map