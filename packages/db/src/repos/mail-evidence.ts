/**
 * Mail Evidence Repository
 *
 * Handles persistence of mail-specific evidence:
 * - DKIM selectors with provenance tracking
 * - Mail evidence summaries
 * - Provider detection results
 */

import { eq } from 'drizzle-orm';
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
    return this.db.insert(dkimSelectors, data);
  }

  /**
   * Create multiple DKIM selector records
   */
  async createMany(data: NewDkimSelector[]): Promise<DkimSelector[]> {
    if (data.length === 0) return [];
    return this.db.insertMany(dkimSelectors, data);
  }

  /**
   * Find selectors by snapshot ID
   */
  async findBySnapshotId(snapshotId: string): Promise<DkimSelector[]> {
    return this.db.selectWhere(dkimSelectors, eq(dkimSelectors.snapshotId, snapshotId));
  }

  /**
   * Find selectors by domain across all snapshots
   */
  async findByDomain(domain: string): Promise<DkimSelector[]> {
    return this.db.selectWhere(dkimSelectors, eq(dkimSelectors.domain, domain));
  }

  /**
   * Find selectors by provider
   */
  async findByProvider(provider: DkimSelector['provider']): Promise<DkimSelector[]> {
    if (!provider) return [];
    return this.db.selectWhere(dkimSelectors, eq(dkimSelectors.provider, provider));
  }

  /**
   * Find valid (found) selectors for a snapshot
   */
  async findValidBySnapshotId(snapshotId: string): Promise<DkimSelector[]> {
    const results = await this.findBySnapshotId(snapshotId);
    return results.filter((s) => s.found === true);
  }

  /**
   * Delete selectors by snapshot ID
   */
  async deleteBySnapshotId(snapshotId: string): Promise<number> {
    const deleted = await this.db.delete(dkimSelectors, eq(dkimSelectors.snapshotId, snapshotId));
    return deleted.length;
  }

  /**
   * Get unique providers for a domain
   */
  async getProvidersForDomain(domain: string): Promise<string[]> {
    const domainResults = await this.findByDomain(domain);
    const foundResults = domainResults.filter((s) => s.found === true);

    const uniqueProviders = new Set<string>();
    for (const r of foundResults) {
      if (r.provider && r.provider !== 'unknown') {
        uniqueProviders.add(r.provider);
      }
    }
    return Array.from(uniqueProviders);
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
      const results = await this.db.update(
        mailEvidence,
        data,
        eq(mailEvidence.snapshotId, data.snapshotId)
      );
      return results[0];
    }

    // Insert
    return this.db.insert(mailEvidence, data);
  }

  /**
   * Find mail evidence by snapshot ID
   */
  async findBySnapshotId(snapshotId: string): Promise<MailEvidence | undefined> {
    return this.db.selectOne(mailEvidence, eq(mailEvidence.snapshotId, snapshotId));
  }

  /**
   * Find mail evidence by domain (latest)
   */
  async findLatestByDomain(domain: string): Promise<MailEvidence | undefined> {
    // Get all by domain and return first (most recent based on insert order)
    const results = await this.db.selectWhere(mailEvidence, eq(mailEvidence.domain, domain));
    // Sort by createdAt descending
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return results[0];
  }

  /**
   * Find all mail evidence for a domain
   */
  async findByDomain(domain: string): Promise<MailEvidence[]> {
    const results = await this.db.selectWhere(mailEvidence, eq(mailEvidence.domain, domain));
    // Sort by createdAt descending
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return results;
  }

  /**
   * Find mail evidence by provider
   */
  async findByProvider(provider: MailEvidence['detectedProvider']): Promise<MailEvidence[]> {
    if (!provider) return [];
    const results = await this.db.selectWhere(
      mailEvidence,
      eq(mailEvidence.detectedProvider, provider)
    );
    // Sort by createdAt descending
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return results;
  }

  /**
   * Find domains without DMARC
   */
  async findWithoutDmarc(limit = 100): Promise<MailEvidence[]> {
    const results = await this.db.selectWhere(mailEvidence, eq(mailEvidence.hasDmarc, false));
    // Sort by createdAt descending
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return results.slice(0, limit);
  }

  /**
   * Find domains with weak DMARC policy
   */
  async findWithWeakDmarc(limit = 100): Promise<MailEvidence[]> {
    const results = await this.db.selectWhere(mailEvidence, eq(mailEvidence.dmarcPolicy, 'none'));
    // Sort by createdAt descending
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return results.slice(0, limit);
  }

  /**
   * Get domains with MTA-STS enabled
   */
  async findWithMtaSts(): Promise<MailEvidence[]> {
    const results = await this.db.selectWhere(mailEvidence, eq(mailEvidence.hasMtaSts, true));
    // Sort by createdAt descending
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return results;
  }

  /**
   * Delete mail evidence by snapshot ID
   */
  async deleteBySnapshotId(snapshotId: string): Promise<number> {
    const deleted = await this.db.delete(mailEvidence, eq(mailEvidence.snapshotId, snapshotId));
    return deleted.length;
  }

  /**
   * Get security score distribution
   */
  async getScoreDistribution(): Promise<{ score: string; count: number }[]> {
    // Get all mail evidence
    const results = await this.db.select(mailEvidence);

    // Group by score ranges
    const distribution: Record<string, number> = {
      '0-20': 0,
      '21-40': 0,
      '41-60': 0,
      '61-80': 0,
      '81-100': 0,
    };

    for (const r of results) {
      const score = Number.parseInt(r.securityScore || '0', 10);
      if (score <= 20) distribution['0-20']++;
      else if (score <= 40) distribution['21-40']++;
      else if (score <= 60) distribution['41-60']++;
      else if (score <= 80) distribution['61-80']++;
      else distribution['81-100']++;
    }

    return Object.entries(distribution).map(([score, count]) => ({ score, count }));
  }
}
