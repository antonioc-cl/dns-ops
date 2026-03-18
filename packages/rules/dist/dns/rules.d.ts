/**
 * DNS Rules Pack - Initial Rules
 *
 * First benchmark-backed DNS rules:
 * 1. Authoritative lookup failures/timeouts
 * 2. Mismatch across authoritative servers
 * 3. Recursive vs authoritative mismatch
 * 4. CNAME coexistence conflict
 * 5. Partial coverage for unmanaged zones
 */
import type { Rule } from '../engine';
export declare const authoritativeFailureRule: Rule;
export declare const authoritativeMismatchRule: Rule;
export declare const recursiveAuthoritativeMismatchRule: Rule;
export declare const cnameCoexistenceRule: Rule;
export declare const unmanagedZonePartialCoverageRule: Rule;
//# sourceMappingURL=rules.d.ts.map