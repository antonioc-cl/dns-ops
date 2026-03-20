/**
 * Ruleset Version Repository
 *
 * Manages the ruleset registry for versioned rule evaluation.
 * Each ruleset version contains serialized rule definitions and
 * can be marked as active for default evaluation.
 */

import { eq } from 'drizzle-orm';
import type { IDatabaseAdapter } from '../database/simple-adapter.js';
import { type NewRulesetVersion, type RulesetVersion, rulesetVersions } from '../schema/index.js';

export class RulesetVersionRepository {
  constructor(private db: IDatabaseAdapter) {}

  /**
   * Find a ruleset version by ID
   */
  async findById(id: string): Promise<RulesetVersion | null> {
    const result = await this.db.selectOne(rulesetVersions, eq(rulesetVersions.id, id));
    return result || null;
  }

  /**
   * Find a ruleset version by version string
   */
  async findByVersion(version: string): Promise<RulesetVersion | null> {
    const result = await this.db.selectOne(rulesetVersions, eq(rulesetVersions.version, version));
    return result || null;
  }

  /**
   * Get the currently active ruleset version
   */
  async findActive(): Promise<RulesetVersion | null> {
    const result = await this.db.selectOne(rulesetVersions, eq(rulesetVersions.active, true));
    return result || null;
  }

  /**
   * List all ruleset versions, most recent first
   */
  async list(limit = 10, offset = 0): Promise<RulesetVersion[]> {
    const all = await this.db.select(rulesetVersions);
    // Sort by createdAt descending
    all.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return all.slice(offset, offset + limit);
  }

  /**
   * Create a new ruleset version
   */
  async create(data: NewRulesetVersion): Promise<RulesetVersion> {
    // If this version is marked as active, deactivate others first
    if (data.active) {
      await this.deactivateAll();
    }
    return this.db.insert(rulesetVersions, data);
  }

  /**
   * Set a specific version as the active ruleset
   * This deactivates all other versions
   */
  async setActive(id: string): Promise<RulesetVersion | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    // Deactivate all versions
    await this.deactivateAll();

    // Activate this version
    await this.db.update(rulesetVersions, { active: true }, eq(rulesetVersions.id, id));

    return this.findById(id);
  }

  /**
   * Deactivate all ruleset versions
   */
  private async deactivateAll(): Promise<void> {
    const active = await this.findActive();
    if (active) {
      await this.db.update(rulesetVersions, { active: false }, eq(rulesetVersions.id, active.id));
    }
  }

  /**
   * Check if a version string already exists
   */
  async versionExists(version: string): Promise<boolean> {
    const result = await this.findByVersion(version);
    return result !== null;
  }

  /**
   * Get the latest version (by creation date)
   */
  async findLatest(): Promise<RulesetVersion | null> {
    const all = await this.db.select(rulesetVersions);
    if (all.length === 0) return null;

    // Sort by createdAt descending and return first
    all.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return all[0];
  }

  /**
   * Count total ruleset versions
   */
  async count(): Promise<number> {
    const all = await this.db.select(rulesetVersions);
    return all.length;
  }

  /**
   * Get or create a ruleset version
   * Used during evaluation to ensure a version exists
   */
  async getOrCreate(
    version: string,
    data: Omit<NewRulesetVersion, 'version'>
  ): Promise<RulesetVersion> {
    const existing = await this.findByVersion(version);
    if (existing) return existing;

    return this.create({
      ...data,
      version,
    });
  }
}
