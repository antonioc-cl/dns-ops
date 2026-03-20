/**
 * Mail Evidence Repository
 *
 * Handles persistence of mail-specific evidence:
 * - DKIM selectors with provenance tracking
 * - Mail evidence summaries
 * - Provider detection results
 */

import { and, desc, eq } from 'drizzle-orm';
import type { IDatabaseAdapter } from '../database/index.js';
import {
  type DkimSelector,
  dkimSelectors,
  type MailEvidence,
  mailEvidence,
  type NewDkimSelector,
  type NewMailEvidence,
} from '../schema/mail.js';

export class DkimSelectorRepository {
  constructor(private db: IDatabaseAdapter) {}

  /**
   * Create a new DKIM selector record
   */
  async create(data: NewDkimSelector): Promise<DkimSelector> {
    const result = await this.db.getDrizzle().insert(dkimSelectors).values(data).returning();
    return result[0];
  }

  /**
   * Create multiple DKIM selector records
   */
  async createMany(data: NewDkimSelector[]): Promise<DkimSelector[]> {
    if (data.length === 0) return [];
    return await this.db.getDrizzle().insert(dkimSelectors).values(data).returning();
  }

  /**
   * Find selectors by snapshot ID
   */
  async findBySnapshotId(snapshotId: string): Promise<DkimSelector[]> {
    return await this.db
      .getDrizzle()
      .select()
      .from(dkimSelectors)
      .where(eq(dkimSelectors.snapshotId, snapshotId))
      .orderBy(dkimSelectors.selector);
  }

  /**
   * Find selectors by domain across all snapshots
   */
  async findByDomain(domain: string): Promise<DkimSelector[]> {
    return await this.db
      .getDrizzle()
      .select()
      .from(dkimSelectors)
      .where(eq(dkimSelectors.domain, domain))
      .orderBy(desc(dkimSelectors.createdAt));
  }

  /**
   * Find selectors by provider
   */
  async findByProvider(provider: string): Promise<DkimSelector[]> {
    return await this.db
      .getDrizzle()
      .select()
      .from(dkimSelectors)
      .where(eq(dkimSelectors.provider, provider as DkimSelector['provider']))
      .orderBy(desc(dkimSelectors.createdAt));
  }

  /**
   * Find valid (found) selectors for a snapshot
   */
  async findValidBySnapshotId(snapshotId: string): Promise<DkimSelector[]> {
    return await this.db
      .getDrizzle()
      .select()
      .from(dkimSelectors)
      .where(and(eq(dkimSelectors.snapshotId, snapshotId), eq(dkimSelectors.found, true)));
  }

  /**
   * Delete selectors by snapshot ID
   */
  async deleteBySnapshotId(snapshotId: string): Promise<number> {
    const result = await this.db
      .getDrizzle()
      .delete(dkimSelectors)
      .where(eq(dkimSelectors.snapshotId, snapshotId));
    return result.rowCount ?? 0;
  }

  /**
   * Get unique providers for a domain
   */
  async getProvidersForDomain(domain: string): Promise<string[]> {
    const results = await this.db
      .getDrizzle()
      .selectDistinct({ provider: dkimSelectors.provider })
      .from(dkimSelectors)
      .where(and(eq(dkimSelectors.domain, domain), eq(dkimSelectors.found, true)));

    return results.map((r) => r.provider).filter((p): p is string => p !== null && p !== 'unknown');
  }
}

export class MailEvidenceRepository {
  constructor(private db: IDatabaseAdapter) {}

  /**
   * Create or update mail evidence for a snapshot
   */
  async upsert(data: NewMailEvidence): Promise<MailEvidence> {
    // Check if exists
    const existing = await this.findBySnapshotId(data.snapshotId);

    if (existing) {
      // Update
      const result = await this.db
        .getDrizzle()
        .update(mailEvidence)
        .set(data)
        .where(eq(mailEvidence.snapshotId, data.snapshotId))
        .returning();
      return result[0];
    }

    // Insert
    const result = await this.db.getDrizzle().insert(mailEvidence).values(data).returning();
    return result[0];
  }

  /**
   * Find mail evidence by snapshot ID
   */
  async findBySnapshotId(snapshotId: string): Promise<MailEvidence | undefined> {
    const results = await this.db
      .getDrizzle()
      .select()
      .from(mailEvidence)
      .where(eq(mailEvidence.snapshotId, snapshotId))
      .limit(1);
    return results[0];
  }

  /**
   * Find mail evidence by domain (latest)
   */
  async findLatestByDomain(domain: string): Promise<MailEvidence | undefined> {
    const results = await this.db
      .getDrizzle()
      .select()
      .from(mailEvidence)
      .where(eq(mailEvidence.domain, domain))
      .orderBy(desc(mailEvidence.createdAt))
      .limit(1);
    return results[0];
  }

  /**
   * Find all mail evidence for a domain
   */
  async findByDomain(domain: string): Promise<MailEvidence[]> {
    return await this.db
      .getDrizzle()
      .select()
      .from(mailEvidence)
      .where(eq(mailEvidence.domain, domain))
      .orderBy(desc(mailEvidence.createdAt));
  }

  /**
   * Find mail evidence by provider
   */
  async findByProvider(provider: string): Promise<MailEvidence[]> {
    return await this.db
      .getDrizzle()
      .select()
      .from(mailEvidence)
      .where(eq(mailEvidence.detectedProvider, provider as MailEvidence['detectedProvider']))
      .orderBy(desc(mailEvidence.createdAt));
  }

  /**
   * Find domains without DMARC
   */
  async findWithoutDmarc(limit = 100): Promise<MailEvidence[]> {
    return await this.db
      .getDrizzle()
      .select()
      .from(mailEvidence)
      .where(eq(mailEvidence.hasDmarc, false))
      .orderBy(desc(mailEvidence.createdAt))
      .limit(limit);
  }

  /**
   * Find domains with weak DMARC policy
   */
  async findWithWeakDmarc(limit = 100): Promise<MailEvidence[]> {
    return await this.db
      .getDrizzle()
      .select()
      .from(mailEvidence)
      .where(eq(mailEvidence.dmarcPolicy, 'none'))
      .orderBy(desc(mailEvidence.createdAt))
      .limit(limit);
  }

  /**
   * Get domains with MTA-STS enabled
   */
  async findWithMtaSts(): Promise<MailEvidence[]> {
    return await this.db
      .getDrizzle()
      .select()
      .from(mailEvidence)
      .where(eq(mailEvidence.hasMtaSts, true))
      .orderBy(desc(mailEvidence.createdAt));
  }

  /**
   * Delete mail evidence by snapshot ID
   */
  async deleteBySnapshotId(snapshotId: string): Promise<number> {
    const result = await this.db
      .getDrizzle()
      .delete(mailEvidence)
      .where(eq(mailEvidence.snapshotId, snapshotId));
    return result.rowCount ?? 0;
  }

  /**
   * Get security score distribution
   */
  async getScoreDistribution(): Promise<{ score: string; count: number }[]> {
    // Simplified version - returns raw scores
    const results = await this.db
      .getDrizzle()
      .select({ securityScore: mailEvidence.securityScore })
      .from(mailEvidence);

    // Group by score ranges
    const distribution: Record<string, number> = {
      '0-20': 0,
      '21-40': 0,
      '41-60': 0,
      '61-80': 0,
      '81-100': 0,
    };

    for (const r of results) {
      const score = parseInt(r.securityScore || '0', 10);
      if (score <= 20) distribution['0-20']++;
      else if (score <= 40) distribution['21-40']++;
      else if (score <= 60) distribution['41-60']++;
      else if (score <= 80) distribution['61-80']++;
      else distribution['81-100']++;
    }

    return Object.entries(distribution).map(([score, count]) => ({ score, count }));
  }
}
