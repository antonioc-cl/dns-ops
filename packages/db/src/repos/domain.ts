/**
 * DNS Ops Workbench - Domain Repository
 * 
 * Repository pattern for domain operations.
 * Provides type-safe database access with common query patterns.
 */

import { eq, like, desc, and, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { domains, type Domain, type NewDomain } from '../schema.js';
import * as schema from '../schema.js';

type DB = NodePgDatabase<typeof schema> | DrizzleD1Database<typeof schema>;

export class DomainRepository {
  constructor(private db: DB) {}

  /**
   * Find a domain by ID
   */
  async findById(id: string): Promise<Domain | undefined> {
    const result = await this.db
      .select()
      .from(domains)
      .where(eq(domains.id, id))
      .limit(1);
    return result[0];
  }

  /**
   * Find a domain by its normalized name
   */
  async findByName(normalizedName: string): Promise<Domain | undefined> {
    const result = await this.db
      .select()
      .from(domains)
      .where(eq(domains.normalizedName, normalizedName.toLowerCase()))
      .limit(1);
    return result[0];
  }

  /**
   * Search domains by name pattern
   */
  async searchByName(pattern: string, limit: number = 20): Promise<Domain[]> {
    return this.db
      .select()
      .from(domains)
      .where(like(domains.normalizedName, `%${pattern.toLowerCase()}%`))
      .limit(limit);
  }

  /**
   * Get all domains for a tenant
   */
  async findByTenant(tenantId: string, limit: number = 100): Promise<Domain[]> {
    return this.db
      .select()
      .from(domains)
      .where(eq(domains.tenantId, tenantId))
      .limit(limit);
  }

  /**
   * Get domains by zone management type
   */
  async findByZoneManagement(
    zoneManagement: 'managed' | 'unmanaged' | 'unknown',
    limit: number = 100
  ): Promise<Domain[]> {
    return this.db
      .select()
      .from(domains)
      .where(eq(domains.zoneManagement, zoneManagement))
      .limit(limit);
  }

  /**
   * Create a new domain
   */
  async create(data: NewDomain): Promise<Domain> {
    const result = await this.db
      .insert(domains)
      .values({
        ...data,
        normalizedName: data.normalizedName || data.name.toLowerCase(),
      })
      .returning();
    return result[0];
  }

  /**
   * Create a new domain or return existing if name already exists
   */
  async findOrCreate(data: NewDomain): Promise<Domain> {
    const existing = await this.findByName(data.name);
    if (existing) {
      return existing;
    }
    return this.create(data);
  }

  /**
   * Update domain metadata
   */
  async update(id: string, data: Partial<NewDomain>): Promise<Domain | undefined> {
    const result = await this.db
      .update(domains)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(domains.id, id))
      .returning();
    return result[0];
  }

  /**
   * Update zone management status
   */
  async updateZoneManagement(
    id: string,
    zoneManagement: 'managed' | 'unmanaged' | 'unknown'
  ): Promise<Domain | undefined> {
    return this.update(id, { zoneManagement });
  }

  /**
   * List all domains with pagination
   */
  async list(options: { limit?: number; offset?: number } = {}): Promise<Domain[]> {
    const { limit = 100, offset = 0 } = options;
    return this.db
      .select()
      .from(domains)
      .orderBy(desc(domains.createdAt))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Count total domains
   */
  async count(): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(domains);
    return result[0]?.count || 0;
  }
}
