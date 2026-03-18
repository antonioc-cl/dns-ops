/**
 * DNS Ops Workbench - Rules Engine
 *
 * Deterministic rules engine that evaluates observations and produces findings.
 * All findings are evidence-backed and versioned by ruleset.
 */
import type { Observation, RecordSet, NewFinding, NewSuggestion } from '../../../db/src/schema';
import type { Severity, Confidence, BlastRadius } from '../../../contracts/src/enums';
export interface RuleContext {
    snapshotId: string;
    domainId: string;
    domainName: string;
    zoneManagement: 'managed' | 'unmanaged' | 'unknown';
    observations: Observation[];
    recordSets: RecordSet[];
    rulesetVersion: string;
}
export interface RuleResult {
    finding?: Omit<NewFinding, 'id' | 'snapshotId' | 'createdAt'>;
    suggestions?: Omit<NewSuggestion, 'id' | 'findingId' | 'createdAt'>[];
}
export interface Rule {
    id: string;
    name: string;
    description: string;
    version: string;
    enabled: boolean;
    evaluate: (context: RuleContext) => RuleResult | null;
}
export interface Ruleset {
    id: string;
    version: string;
    name: string;
    description: string;
    rules: Rule[];
    createdAt: Date;
}
/**
 * Rules Engine - evaluates observations against rules and produces findings
 */
export declare class RulesEngine {
    private ruleset;
    constructor(ruleset: Ruleset);
    /**
     * Evaluate all rules in the ruleset against the context
     */
    evaluate(context: RuleContext): {
        findings: NewFinding[];
        suggestions: NewSuggestion[];
    };
    /**
     * Get the current ruleset version
     */
    getRulesetVersion(): string;
    /**
     * Get enabled rules count
     */
    getEnabledRulesCount(): number;
}
/**
 * Helper to create evidence links for findings
 */
export declare function createEvidence(observationId: string, description: string, recordSetId?: string): {
    observationId: string;
    recordSetId: string | undefined;
    description: string;
}[];
/**
 * Helper to determine blast radius based on zone management and record type
 */
export declare function inferBlastRadius(zoneManagement: 'managed' | 'unmanaged' | 'unknown', recordType: string): BlastRadius;
/**
 * Helper to determine review-only flag
 */
export declare function isReviewOnly(severity: Severity, blastRadius: BlastRadius, confidence: Confidence): boolean;
//# sourceMappingURL=index.d.ts.map