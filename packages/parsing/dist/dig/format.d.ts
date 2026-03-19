/**
 * Dig-Style Output Formatting
 *
 * Format DNS observations in dig-like text format for familiar CLI presentation.
 */
import type { Observation } from '@dns-ops/db/schema';
interface DigFormatOptions {
    showComments?: boolean;
    showQuestion?: boolean;
}
/**
 * Format a single observation as dig-style output
 */
export declare function toDigFormat(observation: Observation, options?: DigFormatOptions): string;
/**
 * Format multiple observations as dig-style output
 */
export declare function observationsToDigFormat(observations: Observation[], options?: DigFormatOptions): string;
/**
 * Get status color for dig output
 */
export declare function getStatusColor(status: string): 'green' | 'yellow' | 'red';
export {};
//# sourceMappingURL=format.d.ts.map