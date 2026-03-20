/**
 * Suggestion Repository
 *
 * Manages remediation suggestions linked to findings.
 * Suggestions provide actionable guidance for addressing findings.
 */
import type { IDatabaseAdapter } from '../database/simple-adapter.js';
import { type NewSuggestion, type Suggestion } from '../schema/index.js';
export declare class SuggestionRepository {
    private db;
    constructor(db: IDatabaseAdapter);
    /**
     * Find a suggestion by ID
     */
    findById(id: string): Promise<Suggestion | null>;
    /**
     * Find all suggestions for a finding
     */
    findByFindingId(findingId: string): Promise<Suggestion[]>;
    /**
     * Find suggestions for multiple findings
     */
    findByFindingIds(findingIds: string[]): Promise<Map<string, Suggestion[]>>;
    /**
     * Create a new suggestion
     */
    create(data: NewSuggestion): Promise<Suggestion>;
    /**
     * Create multiple suggestions
     */
    createMany(data: NewSuggestion[]): Promise<Suggestion[]>;
    /**
     * Mark a suggestion as applied
     */
    markApplied(id: string, appliedBy: string): Promise<Suggestion | null>;
    /**
     * Mark a suggestion as dismissed
     */
    markDismissed(id: string, dismissedBy: string, reason?: string): Promise<Suggestion | null>;
    /**
     * Delete all suggestions for a finding
     * Used when re-evaluating findings
     */
    deleteByFindingId(findingId: string): Promise<number>;
    /**
     * Get pending suggestions (not applied, not dismissed)
     */
    findPendingByFindingId(findingId: string): Promise<Suggestion[]>;
    /**
     * Count suggestions by state
     */
    countByState(findingId: string): Promise<{
        pending: number;
        applied: number;
        dismissed: number;
    }>;
}
//# sourceMappingURL=suggestion.d.ts.map