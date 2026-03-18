/**
 * Provider Templates - Bead 09
 *
 * Narrow provider-template pack for top providers.
 * Data-backed template storage for expected configurations.
 */
export interface ProviderTemplate {
    id: string;
    provider: KnownProvider;
    name: string;
    description: string;
    version: string;
    expected: {
        mx?: MxExpectation[];
        spf?: SpfExpectation;
        dmarc?: DmarcExpectation;
        dkim?: DkimExpectation;
        mtaSts?: boolean;
        tlsRpt?: boolean;
    };
    knownSelectors: string[];
    detection: {
        mxPatterns: RegExp[];
        spfPatterns: RegExp[];
    };
}
export interface MxExpectation {
    priority: number;
    pattern: RegExp;
    description: string;
}
export interface SpfExpectation {
    required: boolean;
    include?: string;
    patterns: RegExp[];
}
export interface DmarcExpectation {
    required: boolean;
    recommendedPolicy: 'none' | 'quarantine' | 'reject';
}
export interface DkimExpectation {
    required: boolean;
    selectors: string[];
}
export type KnownProvider = 'google-workspace' | 'microsoft-365' | 'amazon-ses' | 'sendgrid' | 'mailgun' | 'other' | 'unknown';
export declare const PROVIDER_TEMPLATES: Record<KnownProvider, ProviderTemplate>;
export interface ProviderDetectionResult {
    provider: KnownProvider;
    confidence: 'certain' | 'high' | 'medium' | 'low';
    evidence: string[];
}
export declare function detectProviderFromDns(mxRecords: string[], spfRecord?: string): ProviderDetectionResult;
export interface TemplateComparisonResult {
    provider: KnownProvider;
    matches: Array<{
        aspect: string;
        expected: string;
        actual: string;
        matches: boolean;
    }>;
    mismatches: Array<{
        aspect: string;
        expected: string;
        actual: string;
        severity: 'critical' | 'high' | 'medium' | 'low';
    }>;
    missing: Array<{
        aspect: string;
        expected: string;
        severity: 'critical' | 'high' | 'medium' | 'low';
    }>;
    overallMatch: 'full' | 'partial' | 'none';
}
export declare function compareToTemplate(provider: KnownProvider, actual: {
    mx?: string[];
    spf?: string;
    dmarc?: string;
    dkimSelectors?: string[];
    hasMtaSts?: boolean;
    hasTlsRpt?: boolean;
}): TemplateComparisonResult;
export interface TemplateStorage {
    getTemplate(provider: KnownProvider): ProviderTemplate | undefined;
    getAllTemplates(): ProviderTemplate[];
    updateTemplate(template: ProviderTemplate): void;
    addCustomSelector(provider: KnownProvider, selector: string): void;
}
export declare const templateStorage: TemplateStorage;
//# sourceMappingURL=templates.d.ts.map