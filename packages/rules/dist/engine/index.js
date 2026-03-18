/**
 * DNS Ops Workbench - Rules Engine
 *
 * Deterministic rules engine that evaluates observations and produces findings.
 * All findings are evidence-backed and versioned by ruleset.
 */
/**
 * Rules Engine - evaluates observations against rules and produces findings
 */
export class RulesEngine {
    ruleset;
    constructor(ruleset) {
        this.ruleset = ruleset;
    }
    /**
     * Evaluate all rules in the ruleset against the context
     */
    evaluate(context) {
        const findings = [];
        const suggestions = [];
        for (const rule of this.ruleset.rules) {
            if (!rule.enabled)
                continue;
            try {
                const result = rule.evaluate(context);
                if (result?.finding) {
                    const finding = {
                        ...result.finding,
                        id: crypto.randomUUID(),
                        snapshotId: context.snapshotId,
                        createdAt: new Date(),
                    };
                    findings.push(finding);
                    // Add suggestions linked to this finding
                    if (result.suggestions) {
                        for (const suggestion of result.suggestions) {
                            suggestions.push({
                                ...suggestion,
                                id: crypto.randomUUID(),
                                findingId: finding.id,
                                createdAt: new Date(),
                            });
                        }
                    }
                }
            }
            catch (error) {
                console.error(`Rule ${rule.id} failed:`, error);
                // Continue with other rules - don't let one failing rule break the engine
            }
        }
        return { findings, suggestions };
    }
    /**
     * Get the current ruleset version
     */
    getRulesetVersion() {
        return this.ruleset.version;
    }
    /**
     * Get enabled rules count
     */
    getEnabledRulesCount() {
        return this.ruleset.rules.filter((r) => r.enabled).length;
    }
}
/**
 * Helper to create evidence links for findings
 */
export function createEvidence(observationId, description, recordSetId) {
    return [
        {
            observationId,
            recordSetId,
            description,
        },
    ];
}
/**
 * Helper to determine blast radius based on zone management and record type
 */
export function inferBlastRadius(zoneManagement, recordType) {
    if (zoneManagement !== 'managed') {
        return 'single-domain';
    }
    // NS records at apex affect the entire zone
    if (recordType === 'NS') {
        return 'subdomain-tree';
    }
    // SOA affects the entire zone
    if (recordType === 'SOA') {
        return 'subdomain-tree';
    }
    // MX affects mail for the domain
    if (recordType === 'MX') {
        return 'single-domain';
    }
    return 'single-domain';
}
/**
 * Helper to determine review-only flag
 */
export function isReviewOnly(severity, blastRadius, confidence) {
    // High/critical severity always requires review
    if (severity === 'critical' || severity === 'high') {
        return true;
    }
    // Anything affecting multiple domains requires review
    if (blastRadius === 'related-domains' || blastRadius === 'infrastructure' || blastRadius === 'organization-wide') {
        return true;
    }
    // Low confidence findings require review
    if (confidence === 'low' || confidence === 'heuristic') {
        return true;
    }
    return false;
}
//# sourceMappingURL=index.js.map