/**
 * DNS Ops Workbench - Benchmark Corpus
 *
 * Representative domains and test cases for validating the system.
 * Each case has a known expected outcome or explicit "ambiguous by design" label.
 *
 * Categories:
 * - known-good-managed: Well-configured zones under our management
 * - known-good-unmanaged: Well-configured third-party zones
 * - historical-incidents: Domains with past issues (anonymized)
 * - intentionally-misconfigured: Test zones with deliberate issues
 * - edge-cases: IDN, wildcards, NXDOMAIN, NODATA, stale IPs
 */
import type { ResultState, ZoneManagement } from '@dns-ops/contracts';
export interface BenchmarkCase {
    /** Unique identifier for the test case */
    id: string;
    /** Human-readable description */
    description: string;
    /** Domain name to test */
    domain: string;
    /** Expected zone management classification */
    zoneManagement: ZoneManagement;
    /** Expected result state */
    expectedResult: ResultState;
    /** Category of test case */
    category: BenchmarkCategory;
    /** Specific test characteristics */
    characteristics: TestCharacteristic[];
    /** Expected findings (empty for ambiguous cases) */
    expectedFindings?: ExpectedFinding[];
    /** Notes for testers */
    notes?: string;
    /** Whether this case is "ambiguous by design" */
    ambiguousByDesign?: boolean;
}
export type BenchmarkCategory = 'known-good-managed' | 'known-good-unmanaged' | 'historical-incident' | 'intentionally-misconfigured' | 'edge-case';
export type TestCharacteristic = 'valid-dnssec' | 'invalid-dnssec' | 'no-dnssec' | 'has-mx' | 'null-mx' | 'no-mx' | 'has-spf' | 'no-spf' | 'has-dmarc' | 'no-dmarc' | 'has-dkim' | 'no-dkim' | 'cname-at-apex' | 'wildcard-records' | 'idn-punycode' | 'nxdomain' | 'nodata' | 'stale-ip' | 'lame-delegation' | 'glue-mismatch' | 'ns-mismatch' | 'timeout-prone' | 'refuse-queries';
export interface ExpectedFinding {
    /** Type of finding */
    type: string;
    /** Expected severity */
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    /** Expected confidence */
    confidence: 'certain' | 'high' | 'medium' | 'low' | 'heuristic';
    /** Whether finding requires review */
    reviewOnly: boolean;
}
export declare const knownGoodManaged: BenchmarkCase[];
export declare const knownGoodUnmanaged: BenchmarkCase[];
export declare const historicalIncidents: BenchmarkCase[];
export declare const intentionallyMisconfigured: BenchmarkCase[];
export declare const edgeCases: BenchmarkCase[];
export declare const benchmarkCorpus: BenchmarkCase[];
/**
 * Get benchmark cases by category
 */
export declare function getCasesByCategory(category: BenchmarkCategory): BenchmarkCase[];
/**
 * Get benchmark case by ID
 */
export declare function getCaseById(id: string): BenchmarkCase | undefined;
/**
 * Get all managed zone test cases
 */
export declare function getManagedCases(): BenchmarkCase[];
/**
 * Get all unmanaged zone test cases
 */
export declare function getUnmanagedCases(): BenchmarkCase[];
/**
 * Get cases with specific characteristics
 */
export declare function getCasesByCharacteristic(characteristic: TestCharacteristic): BenchmarkCase[];
export default benchmarkCorpus;
//# sourceMappingURL=index.d.ts.map