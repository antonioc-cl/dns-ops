/**
 * Suggestion Repository
 *
 * Manages remediation suggestions linked to findings.
 * Suggestions provide actionable guidance for addressing findings.
 */
import { eq } from 'drizzle-orm';
import { suggestions } from '../schema/index.js';
export class SuggestionRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    /**
     * Find a suggestion by ID
     */
    async findById(id) {
        const result = await this.db.selectOne(suggestions, eq(suggestions.id, id));
        return result || null;
    }
    /**
     * Find all suggestions for a finding
     */
    async findByFindingId(findingId) {
        return this.db.selectWhere(suggestions, eq(suggestions.findingId, findingId));
    }
    /**
     * Find suggestions for multiple findings
     */
    async findByFindingIds(findingIds) {
        const result = new Map();
        // Initialize empty arrays for all finding IDs
        for (const id of findingIds) {
            result.set(id, []);
        }
        // Fetch suggestions for each finding
        for (const findingId of findingIds) {
            const findingSuggestions = await this.findByFindingId(findingId);
            result.set(findingId, findingSuggestions);
        }
        return result;
    }
    /**
     * Create a new suggestion
     */
    async create(data) {
        return this.db.insert(suggestions, data);
    }
    /**
     * Create multiple suggestions
     */
    async createMany(data) {
        if (data.length === 0)
            return [];
        return this.db.insertMany(suggestions, data);
    }
    /**
     * Mark a suggestion as applied
     */
    async markApplied(id, appliedBy) {
        const existing = await this.findById(id);
        if (!existing)
            return null;
        await this.db.update(suggestions, {
            appliedAt: new Date(),
            appliedBy,
        }, eq(suggestions.id, id));
        return this.findById(id);
    }
    /**
     * Mark a suggestion as dismissed
     */
    async markDismissed(id, dismissedBy, reason) {
        const existing = await this.findById(id);
        if (!existing)
            return null;
        await this.db.update(suggestions, {
            dismissedAt: new Date(),
            dismissedBy,
            dismissalReason: reason || null,
        }, eq(suggestions.id, id));
        return this.findById(id);
    }
    /**
     * Delete all suggestions for a finding
     * Used when re-evaluating findings
     */
    async deleteByFindingId(findingId) {
        const existing = await this.findByFindingId(findingId);
        if (existing.length === 0)
            return 0;
        await this.db.delete(suggestions, eq(suggestions.findingId, findingId));
        return existing.length;
    }
    /**
     * Get pending suggestions (not applied, not dismissed)
     */
    async findPendingByFindingId(findingId) {
        const all = await this.findByFindingId(findingId);
        return all.filter((s) => !s.appliedAt && !s.dismissedAt);
    }
    /**
     * Count suggestions by state
     */
    async countByState(findingId) {
        const all = await this.findByFindingId(findingId);
        return {
            pending: all.filter((s) => !s.appliedAt && !s.dismissedAt).length,
            applied: all.filter((s) => s.appliedAt).length,
            dismissed: all.filter((s) => s.dismissedAt).length,
        };
    }
}
//# sourceMappingURL=suggestion.js.map