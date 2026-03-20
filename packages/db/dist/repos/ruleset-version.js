/**
 * Ruleset Version Repository
 *
 * Manages the ruleset registry for versioned rule evaluation.
 * Each ruleset version contains serialized rule definitions and
 * can be marked as active for default evaluation.
 */
import { eq } from 'drizzle-orm';
import { rulesetVersions } from '../schema/index.js';
export class RulesetVersionRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    /**
     * Find a ruleset version by ID
     */
    async findById(id) {
        const result = await this.db.selectOne(rulesetVersions, eq(rulesetVersions.id, id));
        return result || null;
    }
    /**
     * Find a ruleset version by version string
     */
    async findByVersion(version) {
        const result = await this.db.selectOne(rulesetVersions, eq(rulesetVersions.version, version));
        return result || null;
    }
    /**
     * Get the currently active ruleset version
     */
    async findActive() {
        const result = await this.db.selectOne(rulesetVersions, eq(rulesetVersions.active, true));
        return result || null;
    }
    /**
     * List all ruleset versions, most recent first
     */
    async list(limit = 10, offset = 0) {
        const all = await this.db.select(rulesetVersions);
        // Sort by createdAt descending
        all.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return all.slice(offset, offset + limit);
    }
    /**
     * Create a new ruleset version
     */
    async create(data) {
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
    async setActive(id) {
        const existing = await this.findById(id);
        if (!existing)
            return null;
        // Deactivate all versions
        await this.deactivateAll();
        // Activate this version
        await this.db.update(rulesetVersions, { active: true }, eq(rulesetVersions.id, id));
        return this.findById(id);
    }
    /**
     * Deactivate all ruleset versions
     */
    async deactivateAll() {
        const active = await this.findActive();
        if (active) {
            await this.db.update(rulesetVersions, { active: false }, eq(rulesetVersions.id, active.id));
        }
    }
    /**
     * Check if a version string already exists
     */
    async versionExists(version) {
        const result = await this.findByVersion(version);
        return result !== null;
    }
    /**
     * Get the latest version (by creation date)
     */
    async findLatest() {
        const all = await this.db.select(rulesetVersions);
        if (all.length === 0)
            return null;
        // Sort by createdAt descending and return first
        all.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return all[0];
    }
    /**
     * Count total ruleset versions
     */
    async count() {
        const all = await this.db.select(rulesetVersions);
        return all.length;
    }
    /**
     * Get or create a ruleset version
     * Used during evaluation to ensure a version exists
     */
    async getOrCreate(version, data) {
        const existing = await this.findByVersion(version);
        if (existing)
            return existing;
        return this.create({
            ...data,
            version,
        });
    }
}
//# sourceMappingURL=ruleset-version.js.map