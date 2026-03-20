/**
 * Suggestion Repository
 *
 * Manages remediation suggestions linked to findings.
 * Suggestions provide actionable guidance for addressing findings.
 */

import { eq } from 'drizzle-orm';
import type { IDatabaseAdapter } from '../database/simple-adapter.js';
import { type NewSuggestion, type Suggestion, suggestions } from '../schema/index.js';

export class SuggestionRepository {
  constructor(private db: IDatabaseAdapter) {}

  /**
   * Find a suggestion by ID
   */
  async findById(id: string): Promise<Suggestion | null> {
    const result = await this.db.selectOne(suggestions, eq(suggestions.id, id));
    return result || null;
  }

  /**
   * Find all suggestions for a finding
   */
  async findByFindingId(findingId: string): Promise<Suggestion[]> {
    return this.db.selectWhere(suggestions, eq(suggestions.findingId, findingId));
  }

  /**
   * Find suggestions for multiple findings
   */
  async findByFindingIds(findingIds: string[]): Promise<Map<string, Suggestion[]>> {
    const result = new Map<string, Suggestion[]>();

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
  async create(data: NewSuggestion): Promise<Suggestion> {
    return this.db.insert(suggestions, data);
  }

  /**
   * Create multiple suggestions
   */
  async createMany(data: NewSuggestion[]): Promise<Suggestion[]> {
    if (data.length === 0) return [];
    return this.db.insertMany(suggestions, data);
  }

  /**
   * Mark a suggestion as applied
   */
  async markApplied(id: string, appliedBy: string): Promise<Suggestion | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    await this.db.update(
      suggestions,
      {
        appliedAt: new Date(),
        appliedBy,
      },
      eq(suggestions.id, id)
    );

    return this.findById(id);
  }

  /**
   * Mark a suggestion as dismissed
   */
  async markDismissed(
    id: string,
    dismissedBy: string,
    reason?: string
  ): Promise<Suggestion | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    await this.db.update(
      suggestions,
      {
        dismissedAt: new Date(),
        dismissedBy,
        dismissalReason: reason || null,
      },
      eq(suggestions.id, id)
    );

    return this.findById(id);
  }

  /**
   * Delete all suggestions for a finding
   * Used when re-evaluating findings
   */
  async deleteByFindingId(findingId: string): Promise<number> {
    const existing = await this.findByFindingId(findingId);
    if (existing.length === 0) return 0;

    await this.db.delete(suggestions, eq(suggestions.findingId, findingId));
    return existing.length;
  }

  /**
   * Get pending suggestions (not applied, not dismissed)
   */
  async findPendingByFindingId(findingId: string): Promise<Suggestion[]> {
    const all = await this.findByFindingId(findingId);
    return all.filter((s) => !s.appliedAt && !s.dismissedAt);
  }

  /**
   * Count suggestions by state
   */
  async countByState(findingId: string): Promise<{
    pending: number;
    applied: number;
    dismissed: number;
  }> {
    const all = await this.findByFindingId(findingId);
    return {
      pending: all.filter((s) => !s.appliedAt && !s.dismissedAt).length,
      applied: all.filter((s) => s.appliedAt).length,
      dismissed: all.filter((s) => s.dismissedAt).length,
    };
  }
}
