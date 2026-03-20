/**
 * Ruleset Version Repository
 *
 * Manages the ruleset registry for versioned rule evaluation.
 * Each ruleset version contains serialized rule definitions and
 * can be marked as active for default evaluation.
 */
import type { IDatabaseAdapter } from '../database/simple-adapter.js';
import { type NewRulesetVersion, type RulesetVersion } from '../schema/index.js';
export declare class RulesetVersionRepository {
    private db;
    constructor(db: IDatabaseAdapter);
    /**
     * Find a ruleset version by ID
     */
    findById(id: string): Promise<RulesetVersion | null>;
    /**
     * Find a ruleset version by version string
     */
    findByVersion(version: string): Promise<RulesetVersion | null>;
    /**
     * Get the currently active ruleset version
     */
    findActive(): Promise<RulesetVersion | null>;
    /**
     * List all ruleset versions, most recent first
     */
    list(limit?: number, offset?: number): Promise<RulesetVersion[]>;
    /**
     * Create a new ruleset version
     */
    create(data: NewRulesetVersion): Promise<RulesetVersion>;
    /**
     * Set a specific version as the active ruleset
     * This deactivates all other versions
     */
    setActive(id: string): Promise<RulesetVersion | null>;
    /**
     * Deactivate all ruleset versions
     */
    private deactivateAll;
    /**
     * Check if a version string already exists
     */
    versionExists(version: string): Promise<boolean>;
    /**
     * Get the latest version (by creation date)
     */
    findLatest(): Promise<RulesetVersion | null>;
    /**
     * Count total ruleset versions
     */
    count(): Promise<number>;
    /**
     * Get or create a ruleset version
     * Used during evaluation to ensure a version exists
     */
    getOrCreate(version: string, data: Omit<NewRulesetVersion, 'version'>): Promise<RulesetVersion>;
}
//# sourceMappingURL=ruleset-version.d.ts.map