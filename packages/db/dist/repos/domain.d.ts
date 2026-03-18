/**
 * DNS Ops Workbench - Domain Repository
 *
 * Repository pattern for domain operations.
 * Provides type-safe database access with common query patterns.
 */
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { type Domain, type NewDomain } from '../schema';
import * as schema from '../schema';
type DB = NodePgDatabase<typeof schema> | DrizzleD1Database<typeof schema>;
export declare class DomainRepository {
    private db;
    constructor(db: DB);
    /**
     * Find a domain by ID
     */
    findById(id: string): Promise<Domain | undefined>;
    /**
     * Find a domain by its normalized name
     */
    findByName(normalizedName: string): Promise<Domain | undefined>;
    /**
     * Search domains by name pattern
     */
    searchByName(pattern: string, limit?: number): Promise<Domain[]>;
    /**
     * Get all domains for a tenant
     */
    findByTenant(tenantId: string, limit?: number): Promise<Domain[]>;
    /**
     * Get domains by zone management type
     */
    findByZoneManagement(zoneManagement: 'managed' | 'unmanaged' | 'unknown', limit?: number): Promise<Domain[]>;
    /**
     * Create a new domain
     */
    create(data: NewDomain): Promise<Domain>;
    /**
     * Create a new domain or return existing if name already exists
     */
    findOrCreate(data: NewDomain): Promise<Domain>;
    /**
     * Update domain metadata
     */
    update(id: string, data: Partial<NewDomain>): Promise<Domain | undefined>;
    /**
     * Update zone management status
     */
    updateZoneManagement(id: string, zoneManagement: 'managed' | 'unmanaged' | 'unknown'): Promise<Domain | undefined>;
    /**
     * List all domains with pagination
     */
    list(options?: {
        limit?: number;
        offset?: number;
    }): Promise<Domain[]>;
    /**
     * Count total domains
     */
    count(): Promise<number>;
}
export {};
//# sourceMappingURL=domain.d.ts.map