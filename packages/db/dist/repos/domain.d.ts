/**
 * Domain Repository
 *
 * Repository pattern for domain operations using the database adapter.
 */
import type { IDatabaseAdapter } from '../database/simple-adapter.js';
import { type Domain, type NewDomain } from '../schema/index.js';
export interface DomainFilter {
    tenantId?: string;
    zoneManagement?: 'managed' | 'unmanaged' | 'unknown';
    search?: string;
}
export declare class DomainRepository {
    private db;
    constructor(db: IDatabaseAdapter);
    /**
     * Find a domain by ID
     */
    findById(id: string): Promise<Domain | undefined>;
    /**
     * Find a domain by its normalized name
     */
    findByName(normalizedName: string): Promise<Domain | undefined>;
    /**
     * Find a domain by its exact name (case-insensitive)
     */
    findByExactName(name: string): Promise<Domain | undefined>;
    /**
     * Search domains by name pattern
     */
    searchByName(pattern: string, limit?: number): Promise<Domain[]>;
    /**
     * Find all domains matching filter criteria
     */
    findAll(filter?: DomainFilter, options?: {
        limit?: number;
        offset?: number;
    }): Promise<Domain[]>;
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
    count(filter?: DomainFilter): Promise<number>;
    /**
     * Delete a domain by ID
     */
    delete(id: string): Promise<Domain | undefined>;
}
//# sourceMappingURL=domain.d.ts.map