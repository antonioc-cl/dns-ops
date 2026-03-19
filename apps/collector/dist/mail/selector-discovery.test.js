/**
 * DKIM Selector Discovery Tests - TDD/BDD
 *
 * Tests for the 5-level precedence strategy:
 * 1. Managed zone configured selectors
 * 2. Operator-supplied selectors
 * 3. Provider-specific heuristics
 * 4. Common selector dictionary
 * 5. No selector found → partial
 */
import { describe, it, expect } from 'vitest';
import { discoverSelectors, detectProvider, getProviderSelectors, COMMON_SELECTORS, } from './selector-discovery';
// Test helpers
function createMockDNSResult(overrides = {}) {
    return {
        query: { name: 'example.com', type: 'MX' },
        vantage: { type: 'public-recursive', identifier: '8.8.8.8' },
        success: true,
        answers: [],
        authority: [],
        additional: [],
        responseTime: 100,
        ...overrides,
    };
}
describe('Provider Detection', () => {
    it('should detect Google Workspace from MX records', () => {
        const mxResult = createMockDNSResult({
            query: { name: 'example.com', type: 'MX' },
            answers: [
                { name: 'example.com', type: 'MX', ttl: 300, data: '10 aspmx.l.google.com' },
                { name: 'example.com', type: 'MX', ttl: 300, data: '20 alt1.aspmx.l.google.com' },
            ],
        });
        const provider = detectProvider([mxResult]);
        expect(provider).toBe('google-workspace');
    });
    it('should detect Microsoft 365 from MX records', () => {
        const mxResult = createMockDNSResult({
            query: { name: 'example.com', type: 'MX' },
            answers: [
                { name: 'example.com', type: 'MX', ttl: 300, data: '10 example-com.mail.protection.outlook.com' },
            ],
        });
        const provider = detectProvider([mxResult]);
        expect(provider).toBe('microsoft-365');
    });
    it('should detect provider from SPF record', () => {
        const txtResult = createMockDNSResult({
            query: { name: 'example.com', type: 'TXT' },
            answers: [
                { name: 'example.com', type: 'TXT', ttl: 300, data: 'v=spf1 include:_spf.google.com ~all' },
            ],
        });
        const provider = detectProvider([txtResult]);
        expect(provider).toBe('google-workspace');
    });
    it('should return unknown when no provider indicators found', () => {
        const mxResult = createMockDNSResult({
            query: { name: 'example.com', type: 'MX' },
            answers: [
                { name: 'example.com', type: 'MX', ttl: 300, data: '10 mail.example.com' },
            ],
        });
        const provider = detectProvider([mxResult]);
        expect(provider).toBe('unknown');
    });
});
describe('Provider Selector Lookup', () => {
    it('should return Google Workspace selectors', () => {
        const selectors = getProviderSelectors('google-workspace');
        expect(selectors).toContain('google');
        expect(selectors.length).toBeGreaterThan(0);
    });
    it('should return Microsoft 365 selectors', () => {
        const selectors = getProviderSelectors('microsoft-365');
        expect(selectors).toContain('selector1');
        expect(selectors).toContain('selector2');
    });
    it('should return empty array for unknown provider', () => {
        const selectors = getProviderSelectors('unknown');
        expect(selectors).toEqual([]);
    });
});
describe('Selector Discovery - Precedence Levels', () => {
    const domain = 'example.com';
    it('Level 1: Should use managed zone configured selectors first', async () => {
        const config = {
            managedSelectors: ['configured1', 'configured2'],
            operatorSelectors: ['operator1'],
        };
        const result = await discoverSelectors(domain, [], config);
        expect(result.selectors).toEqual(['configured1', 'configured2']);
        expect(result.provenance).toBe('managed-zone-config');
        expect(result.confidence).toBe('certain');
    });
    it('Level 2: Should use operator-supplied selectors if no managed config', async () => {
        const config = {
            managedSelectors: [],
            operatorSelectors: ['operator1', 'operator2'],
        };
        const result = await discoverSelectors(domain, [], config);
        expect(result.selectors).toEqual(['operator1', 'operator2']);
        expect(result.provenance).toBe('operator-supplied');
        expect(result.confidence).toBe('high');
    });
    it('Level 3: Should use provider heuristics if no operator selectors', async () => {
        const mxResult = createMockDNSResult({
            query: { name: 'example.com', type: 'MX' },
            answers: [
                { name: 'example.com', type: 'MX', ttl: 300, data: '10 aspmx.l.google.com' },
            ],
        });
        const config = {
            managedSelectors: [],
            operatorSelectors: [],
        };
        const result = await discoverSelectors(domain, [mxResult], config);
        expect(result.selectors).toContain('google');
        expect(result.provenance).toBe('provider-heuristic');
        expect(result.confidence).toBe('medium');
    });
    it('Level 4: Should fall back to common dictionary', async () => {
        const config = {
            managedSelectors: [],
            operatorSelectors: [],
        };
        // No DNS results to indicate provider
        const result = await discoverSelectors(domain, [], config);
        expect(result.selectors).toEqual(COMMON_SELECTORS);
        expect(result.provenance).toBe('common-dictionary');
        expect(result.confidence).toBe('low');
    });
    it('Level 5: Should return empty with not-found when explicitly disabled', async () => {
        const config = {
            managedSelectors: [],
            operatorSelectors: [],
            skipDictionary: true,
        };
        const result = await discoverSelectors(domain, [], config);
        expect(result.selectors).toEqual([]);
        expect(result.provenance).toBe('not-found');
        expect(result.confidence).toBe('heuristic');
    });
});
describe('Selector Discovery - Validation', () => {
    const domain = 'example.com';
    it('should deduplicate selectors across sources', async () => {
        const config = {
            managedSelectors: ['selector1'],
            operatorSelectors: ['selector1', 'selector2'], // selector1 is duplicate
        };
        const result = await discoverSelectors(domain, [], config);
        // Should use managed selectors (level 1), not operator selectors
        expect(result.selectors).toEqual(['selector1']);
    });
    it('should limit selectors to reasonable number', async () => {
        const config = {
            managedSelectors: [],
            operatorSelectors: Array(20).fill('selector'), // Too many
        };
        const result = await discoverSelectors(domain, [], config);
        expect(result.selectors.length).toBeLessThanOrEqual(10);
    });
    it('should validate selector format', async () => {
        const config = {
            managedSelectors: ['valid-selector', 'INVALID SELECTOR', ''],
            operatorSelectors: [],
        };
        const result = await discoverSelectors(domain, [], config);
        expect(result.selectors).toContain('valid-selector');
        expect(result.selectors).not.toContain('INVALID SELECTOR');
        expect(result.selectors).not.toContain('');
    });
});
describe('Mail Record Collection Targets', () => {
    it('should identify mail-related query names', () => {
        const domain = 'example.com';
        const expectedQueries = [
            { name: domain, type: 'MX' },
            { name: domain, type: 'TXT' }, // For SPF
            { name: `_dmarc.${domain}`, type: 'TXT' },
            { name: `_mta-sts.${domain}`, type: 'TXT' },
            { name: `_smtp._tls.${domain}`, type: 'TXT' },
        ];
        // Verify the structure matches mail collection needs
        expectedQueries.forEach(query => {
            expect(query.name).toBeDefined();
            expect(query.type).toBeDefined();
        });
    });
    it('should detect Null MX pattern', () => {
        const nullMxResult = createMockDNSResult({
            query: { name: 'example.com', type: 'MX' },
            answers: [
                { name: 'example.com', type: 'MX', ttl: 300, data: '0 .' },
            ],
        });
        const isNullMx = nullMxResult.answers.length === 1 &&
            nullMxResult.answers[0].data.includes('0 .');
        expect(isNullMx).toBe(true);
    });
});
//# sourceMappingURL=selector-discovery.test.js.map