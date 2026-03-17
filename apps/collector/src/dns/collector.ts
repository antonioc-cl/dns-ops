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

export class DNSCollector {
  private resolver: DNSResolver;
  private config: CollectionConfig;

  constructor(config: CollectionConfig) {
    this.config = config;
    this.resolver = new DNSResolver();
  }

  /**
   * Execute full DNS collection for the domain
   */
  async collect(): Promise<CollectionResult> {
    const startTime = Date.now();
    const errors: CollectionError[] = [];

    // Generate queries based on zone management
    const queries = this.generateQueries();

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
  private generateQueries(): DNSQuery[] {
    const queries: DNSQuery[] = [];
    const { domain, zoneManagement, recordTypes, queryNames } = this.config;

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
    } else {
      // Full zone queries for managed zones
      for (const type of recordTypes) {
        queries.push({ name: domain, type });
      }
    }

    return queries;
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
   * Store results in database (placeholder implementation)
   */
  private async storeResults(
    results: DNSQueryResult[],
    resultState: 'complete' | 'partial' | 'failed'
  ): Promise<string> {
    // TODO: Integrate with @dns-ops/db to actually store observations
    // For now, return a mock snapshot ID
    return `snapshot-${Date.now()}`;
  }
}
