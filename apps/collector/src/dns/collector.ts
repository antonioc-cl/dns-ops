/**
 * DNS Collection Orchestrator
 *
 * Coordinates DNS queries across multiple vantages and stores results.
 */

import { DNSResolver } from './resolver';
import type {
  CollectionConfig,
  CollectionResult,
  CollectionError,
  DNSQuery,
  DNSQueryResult,
  VantageInfo,
} from './types';
import type { Database } from '@dns-ops/db';
import { DomainRepository, SnapshotRepository, ObservationRepository, RecordSetRepository } from '@dns-ops/db/repos';
import { observationsToRecordSets } from '@dns-ops/parsing';
import type { NewObservation, NewSnapshot, NewRecordSet, Observation } from '@dns-ops/db/schema';
import { generateMailQueries, analyzeMailResults } from '../mail/collector';

export class DNSCollector {
  private resolver: DNSResolver;
  private config: CollectionConfig;
  private db: Database;
  private domainRepo: DomainRepository;
  private snapshotRepo: SnapshotRepository;
  private observationRepo: ObservationRepository;
  private recordSetRepo: RecordSetRepository;

  constructor(config: CollectionConfig, db: Database) {
    this.config = config;
    this.resolver = new DNSResolver();
    this.db = db;
    this.domainRepo = new DomainRepository(db);
    this.snapshotRepo = new SnapshotRepository(db);
    this.observationRepo = new ObservationRepository(db);
    this.recordSetRepo = new RecordSetRepository(db);
  }

  /**
   * Execute full DNS collection for the domain
   */
  async collect(): Promise<CollectionResult> {
    const startTime = Date.now();
    const errors: CollectionError[] = [];

    // Generate queries based on zone management
    const queries = await this.generateQueries();

    // Collect from public recursive vantage
    const recursiveResults = await this.collectFromVantage(
      queries,
      {
        type: 'public-recursive',
        identifier: '8.8.8.8', // Google Public DNS
        region: 'us-central',
      },
      errors
    );

    // Collect from authoritative vantages (for managed zones or if NS discovered)
    let authoritativeResults: DNSQueryResult[] = [];
    if (this.config.zoneManagement === 'managed') {
      // For managed zones, query authoritative directly
      const nsRecords = await this.discoverAuthoritativeServers();
      for (const ns of nsRecords) {
        const results = await this.collectFromVantage(
          queries,
          {
            type: 'authoritative',
            identifier: ns,
          },
          errors
        );
        authoritativeResults.push(...results);
      }
    }

    // Combine all results
    const allResults = [...recursiveResults, ...authoritativeResults];

    // Calculate result state
    const resultState = this.calculateResultState(allResults, errors);

    // Store results (placeholder - will integrate with DB)
    const snapshotId = await this.storeResults(allResults, resultState);

    return {
      snapshotId,
      domain: this.config.domain,
      resultState,
      observationCount: allResults.length,
      duration: Date.now() - startTime,
      errors,
    };
  }

  /**
   * Generate queries based on configuration
   */
  private async generateQueries(): Promise<DNSQuery[]> {
    const queries: DNSQuery[] = [];
    const { domain, zoneManagement, recordTypes, queryNames, includeMailRecords, dkimSelectors, managedDkimSelectors } = this.config;

    if (queryNames) {
      // Use explicit query names (targeted inspection)
      for (const name of queryNames) {
        for (const type of recordTypes) {
          queries.push({ name, type });
        }
      }
    } else if (zoneManagement === 'unmanaged') {
      // Targeted inspection for unmanaged zones
      const targetedNames = [
        domain,
        `_dmarc.${domain}`,
        `_mta-sts.${domain}`,
        `_smtp._tls.${domain}`,
      ];

      for (const name of targetedNames) {
        for (const type of recordTypes) {
          queries.push({ name, type });
        }
      }

      // Include mail records with DKIM selector discovery (Bead 08)
      if (includeMailRecords !== false) { // Default to true
        const mailQueries = await this.generateMailQueries(domain, dkimSelectors, managedDkimSelectors);
        queries.push(...mailQueries);
      }
    } else {
      // Full zone queries for managed zones
      for (const type of recordTypes) {
        queries.push({ name: domain, type });
      }

      // Include mail records for managed zones
      if (includeMailRecords !== false) {
        const mailQueries = await this.generateMailQueries(domain, dkimSelectors, managedDkimSelectors);
        queries.push(...mailQueries);
      }
    }

    // Deduplicate queries
    const seen = new Set<string>();
    return queries.filter((q) => {
      const key = `${q.name}|${q.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Generate mail-related queries including DKIM selector discovery
   */
  private async generateMailQueries(
    domain: string,
    operatorSelectors?: string[],
    managedSelectors?: string[]
  ): Promise<DNSQuery[]> {
    const { generateMailQueries: generateMailQueriesFunc } = await import('../mail/collector');

    const mailResult = await generateMailQueriesFunc(domain, [], {
      domain,
      operatorSelectors,
      managedSelectors,
    });

    return mailResult.queries;
  }

  /**
   * Collect queries from a specific vantage
   */
  private async collectFromVantage(
    queries: DNSQuery[],
    vantage: VantageInfo,
    errors: CollectionError[]
  ): Promise<DNSQueryResult[]> {
    const results: DNSQueryResult[] = [];

    for (const query of queries) {
      try {
        const result = await this.resolver.query(query, vantage);
        results.push(result);

        // Track errors for failed queries
        if (!result.success) {
          errors.push({
            queryName: query.name,
            queryType: query.type,
            vantage: vantage.identifier,
            error: result.error || 'Unknown error',
          });
        }
      } catch (error) {
        errors.push({
          queryName: query.name,
          queryType: query.type,
          vantage: vantage.identifier,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Discover authoritative nameservers for the domain
   */
  private async discoverAuthoritativeServers(): Promise<string[]> {
    try {
      const nsResult = await this.resolver.query(
        { name: this.config.domain, type: 'NS' },
        { type: 'public-recursive', identifier: '8.8.8.8' }
      );

      if (nsResult.success && nsResult.answers.length > 0) {
        return nsResult.answers.map((a) => a.data.replace(/\.$/, ''));
      }
    } catch (error) {
      console.error('Failed to discover NS records:', error);
    }

    return [];
  }

  /**
   * Calculate overall result state based on query results
   */
  private calculateResultState(
    results: DNSQueryResult[],
    errors: CollectionError[]
  ): 'complete' | 'partial' | 'failed' {
    if (results.length === 0) {
      return 'failed';
    }

    const successCount = results.filter((r) => r.success).length;
    const totalCount = results.length;

    if (successCount === totalCount) {
      return this.config.zoneManagement === 'unmanaged' ? 'partial' : 'complete';
    }

    if (successCount > 0) {
      return 'partial';
    }

    return 'failed';
  }

  /**
   * Store results in database
   */
  private async storeResults(
    results: DNSQueryResult[],
    resultState: 'complete' | 'partial' | 'failed'
  ): Promise<string> {
    const { domain, zoneManagement, triggeredBy } = this.config;

    // Find or create domain
    let domainRecord = await this.domainRepo.findByName(domain);
    if (!domainRecord) {
      domainRecord = await this.domainRepo.create({
        name: domain,
        normalizedName: domain.toLowerCase(),
        zoneManagement,
      });
    }

    // Create snapshot
    const snapshot = await this.snapshotRepo.create({
      domainId: domainRecord.id,
      domainName: domain,
      resultState,
      queriedNames: [...new Set(results.map(r => r.query.name))],
      queriedTypes: [...new Set(results.map(r => r.query.type))],
      vantages: [...new Set(results.map(r => r.vantage.identifier))],
      zoneManagement,
      triggeredBy: triggeredBy || 'system',
    });

    // Create observations for each result
    const observationData: NewObservation[] = results.map(result => ({
      snapshotId: snapshot.id,
      queryName: result.query.name,
      queryType: result.query.type,
      vantageType: result.vantage.type === 'public-recursive' ? 'public-recursive' : 'authoritative',
      vantageIdentifier: result.vantage.identifier,
      status: result.success ? 'success' : this.mapErrorToStatus(result.error),
      queriedAt: new Date(),
      responseTimeMs: result.responseTime,
      responseCode: result.responseCode ?? null,
      flags: result.flags ? {
        authoritative: result.flags.aa,
        truncated: result.flags.tc,
        recursionDesired: result.flags.rd,
        recursionAvailable: result.flags.ra,
        authenticated: result.flags.ad,
        checkingDisabled: result.flags.cd,
      } : null,
      answerSection: result.answers.map(a => ({
        name: a.name,
        type: a.type,
        ttl: a.ttl,
        data: a.data,
      })),
      authoritySection: result.authority.map(a => ({
        name: a.name,
        type: a.type,
        ttl: a.ttl,
        data: a.data,
      })),
      additionalSection: result.additional.map(a => ({
        name: a.name,
        type: a.type,
        ttl: a.ttl,
        data: a.data,
      })),
      errorMessage: result.error || null,
    }));

    const createdObservations = await this.observationRepo.createMany(observationData);

    // Create recordsets from observations
    await this.createRecordSetsFromObservations(snapshot.id, createdObservations);

    return snapshot.id;
  }

  /**
   * Map error message to collection status
   */
  private mapErrorToStatus(error: string | undefined): 'timeout' | 'refused' | 'nxdomain' | 'error' {
    if (!error) return 'error';
    if (error.includes('timeout')) return 'timeout';
    if (error.includes('ECONNREFUSED') || error.includes('REFUSED')) return 'refused';
    if (error.includes('ENOTFOUND') || error.includes('NXDOMAIN')) return 'nxdomain';
    return 'error';
  }

  /**
   * Create RecordSets from normalized observations
   */
  private async createRecordSetsFromObservations(
    snapshotId: string,
    observations: Observation[]
  ): Promise<void> {
    const normalizedRecords = observationsToRecordSets(observations);

    const recordSetData: NewRecordSet[] = normalizedRecords.map(record => ({
      snapshotId,
      name: record.name,
      type: record.type,
      ttl: record.ttl,
      values: record.values,
      sourceObservationIds: record.sourceObservationIds,
      sourceVantages: record.sourceVantages,
      isConsistent: record.isConsistent,
      consolidationNotes: record.consolidationNotes || null,
    }));

    if (recordSetData.length > 0) {
      await this.recordSetRepo.createMany(recordSetData);
    }
  }
}
