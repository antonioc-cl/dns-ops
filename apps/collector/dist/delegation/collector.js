/**
 * Delegation Collection Module
 *
 * Collects delegation-related DNS data:
 * - Parent zone delegation view
 * - Per-authoritative-server answers
 * - Glue records
 * - DNSSEC observation fields
 * - Lame delegation detection
 */
import { DNSResolver } from '../dns/resolver.js';
export class DelegationCollector {
    resolver;
    domain;
    constructor(domain) {
        this.domain = domain;
        this.resolver = new DNSResolver();
    }
    /**
     * Extract parent zone from domain
     * example.com -> com
     * sub.example.com -> example.com
     * deep.sub.example.com -> sub.example.com
     */
    getParentZone(domain) {
        const labels = domain.split('.');
        if (labels.length < 2) {
            return '.'; // Root
        }
        if (labels.length === 2) {
            return labels[1]; // TLD (e.g., 'com' for 'example.com')
        }
        return labels.slice(1).join('.');
    }
    /**
     * Collect delegation view from parent zone
     */
    async collectParentDelegation(recursiveResolver) {
        const vantage = {
            type: 'public-recursive',
            identifier: recursiveResolver,
            region: 'us-central',
        };
        return this.resolver.query({ name: this.domain, type: 'NS' }, vantage);
    }
    /**
     * Query each authoritative server individually
     */
    async collectFromAuthoritativeServers(query, nsServers) {
        const results = [];
        for (const server of nsServers) {
            const startTime = Date.now();
            try {
                const vantage = {
                    type: 'authoritative',
                    identifier: server,
                };
                const result = await this.resolver.query(query, vantage);
                results.push({
                    server,
                    result,
                    responseTime: Date.now() - startTime,
                });
            }
            catch (error) {
                // Record failure as a result
                results.push({
                    server,
                    result: {
                        query,
                        vantage: { type: 'authoritative', identifier: server },
                        success: false,
                        responseTime: Date.now() - startTime,
                        error: error instanceof Error ? error.message : 'Unknown error',
                        answers: [],
                        authority: [],
                        additional: [],
                    },
                    responseTime: Date.now() - startTime,
                });
            }
        }
        return results;
    }
    /**
     * Extract glue records from additional section
     */
    extractGlueRecords(result) {
        if (!result.additional || result.additional.length === 0) {
            return [];
        }
        // Glue is A/AAAA records for NS targets in the same zone
        const nsTargets = result.answers
            .filter((a) => a.type === 'NS')
            .map((a) => a.data.toLowerCase());
        return result.additional.filter((record) => (record.type === 'A' || record.type === 'AAAA') &&
            nsTargets.some((target) => record.name.toLowerCase() === target));
    }
    /**
     * Detect missing glue when NS target is in-zone
     */
    detectMissingGlue(result) {
        const missing = [];
        const glue = this.extractGlueRecords(result);
        const glueTargets = new Set(glue.map((g) => g.name.toLowerCase()));
        for (const answer of result.answers) {
            if (answer.type !== 'NS')
                continue;
            const target = answer.data.toLowerCase();
            // If NS target is in the same zone, it should have glue
            if (target.endsWith(`.${this.domain.toLowerCase()}`) ||
                target === this.domain.toLowerCase()) {
                if (!glueTargets.has(target)) {
                    missing.push(target);
                }
            }
        }
        return missing;
    }
    /**
     * Detect divergence in answers across authoritative servers
     */
    detectDivergence(responses) {
        const details = [];
        // Group by query
        const byQuery = new Map();
        for (const resp of responses) {
            const key = `${resp.result.query.name}|${resp.result.query.type}`;
            if (!byQuery.has(key)) {
                byQuery.set(key, []);
            }
            byQuery.get(key)?.push(resp);
        }
        // Check each query for divergence
        for (const [key, queryResponses] of byQuery) {
            const [name, type] = key.split('|');
            // Get successful responses
            const successful = queryResponses.filter((r) => r.result.success && r.result.answers.length > 0);
            if (successful.length < 2)
                continue;
            // Compare answers
            const firstAnswers = successful[0].result.answers.map((a) => a.data).sort();
            const divergentServers = [successful[0].server];
            const differentAnswers = [successful[0].result.answers];
            for (let i = 1; i < successful.length; i++) {
                const currentAnswers = successful[i].result.answers.map((a) => a.data).sort();
                if (!this.arraysEqual(firstAnswers, currentAnswers)) {
                    divergentServers.push(successful[i].server);
                    differentAnswers.push(successful[i].result.answers);
                }
            }
            if (divergentServers.length > 1) {
                details.push({
                    queryName: name,
                    queryType: type,
                    serversWithDifferentAnswers: divergentServers,
                    differentAnswers,
                });
            }
        }
        return {
            hasDivergence: details.length > 0,
            divergenceDetails: details,
        };
    }
    /**
     * Detect lame delegation
     */
    detectLameDelegation(responses) {
        const lame = [];
        for (const resp of responses) {
            if (!resp.result.success) {
                lame.push({
                    server: resp.server,
                    reason: this.categorizeFailure(resp.result.error || ''),
                });
            }
            else if (!resp.result.flags?.aa) {
                // Not authoritative
                lame.push({
                    server: resp.server,
                    reason: 'not-authoritative',
                });
            }
        }
        return lame;
    }
    /**
     * Collect with DNSSEC flags
     */
    async collectWithDnssec(name, type, recursiveResolver) {
        const vantage = {
            type: 'public-recursive',
            identifier: recursiveResolver,
            region: 'us-central',
        };
        return this.resolver.query({ name, type }, vantage);
    }
    /**
     * Collect DNSKEY records
     */
    async collectDnskey(domain, recursiveResolver) {
        return this.collectWithDnssec(domain, 'DNSKEY', recursiveResolver);
    }
    /**
     * Collect DS records from parent
     */
    async collectDsFromParent(domain, recursiveResolver) {
        return this.collectWithDnssec(domain, 'DS', recursiveResolver);
    }
    /**
     * Generate complete delegation summary
     */
    async collectDelegationSummary(recursiveResolver) {
        // 1. Get parent delegation view
        const parentResult = await this.collectParentDelegation(recursiveResolver);
        if (!parentResult.success) {
            throw new Error(`Failed to collect parent delegation: ${parentResult.error}`);
        }
        // 2. Extract NS servers
        const nsServers = parentResult.answers
            .filter((a) => a.type === 'NS')
            .map((a) => a.data.replace(/\.$/, ''));
        // 3. Query each authoritative server
        const authResponses = await this.collectFromAuthoritativeServers({ name: this.domain, type: 'NS' }, nsServers);
        // 4. Extract glue
        const glueRecords = this.extractGlueRecords(parentResult);
        const missingGlue = this.detectMissingGlue(parentResult);
        // 5. Detect divergence
        const { hasDivergence, divergenceDetails } = this.detectDivergence(authResponses);
        // 6. Detect lame delegation
        const lameDelegations = this.detectLameDelegation(authResponses);
        // 7. Collect DNSSEC info
        const dnssecInfo = await this.collectDnssecInfo(recursiveResolver);
        return {
            domain: this.domain,
            parentZone: this.getParentZone(this.domain),
            parentNs: parentResult.answers.filter((a) => a.type === 'NS'),
            authoritativeResponses: authResponses,
            glueRecords,
            missingGlue,
            hasDivergence,
            divergenceDetails,
            lameDelegations,
            dnssecInfo,
        };
    }
    /**
     * Collect DNSSEC information
     */
    async collectDnssecInfo(recursiveResolver) {
        try {
            // Get DNSKEY
            const dnskeyResult = await this.collectDnskey(this.domain, recursiveResolver);
            // Get DS from parent
            const dsResult = await this.collectDsFromParent(this.domain, recursiveResolver);
            // Check for RRSIG in a typical query
            const sampleQuery = await this.collectWithDnssec(this.domain, 'A', recursiveResolver);
            const hasRrsig = sampleQuery.authority?.some((r) => r.type === 'RRSIG') ||
                sampleQuery.answers?.some((r) => r.type === 'RRSIG');
            return {
                hasRrsig,
                adFlagSet: sampleQuery.flags?.ad || false,
                dnskeyRecords: dnskeyResult.success ? dnskeyResult.answers : [],
                dsRecords: dsResult.success ? dsResult.answers : [],
                validatingSource: recursiveResolver,
            };
        }
        catch (error) {
            console.error('Error collecting DNSSEC info:', error);
            return null;
        }
    }
    /**
     * Categorize failure reason
     */
    categorizeFailure(error) {
        if (error.includes('timeout'))
            return 'timeout';
        if (error.includes('refused') || error.includes('ECONNREFUSED'))
            return 'refused';
        return 'error';
    }
    /**
     * Compare arrays for equality
     */
    arraysEqual(a, b) {
        if (a.length !== b.length)
            return false;
        return a.every((val, i) => val === b[i]);
    }
}
//# sourceMappingURL=collector.js.map