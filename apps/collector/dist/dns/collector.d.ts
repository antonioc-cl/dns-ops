/**
 * DNS Collection Orchestrator
 *
 * Coordinates DNS queries across multiple vantages and stores results.
 */
import type { CollectionConfig, CollectionResult } from './types.js';
import type { IDatabaseAdapter } from '@dns-ops/db';
export declare class DNSCollector {
    private resolver;
    private config;
    private domainRepo;
    private snapshotRepo;
    private observationRepo;
    private recordSetRepo;
    constructor(config: CollectionConfig, db: IDatabaseAdapter);
    /**
     * Execute full DNS collection for the domain
     */
    collect(): Promise<CollectionResult>;
    /**
     * Generate queries based on configuration
     */
    private generateQueries;
    /**
     * Generate mail-related queries including DKIM selector discovery
     */
    private generateMailQueries;
    /**
     * Collect queries from a specific vantage
     */
    private collectFromVantage;
    /**
     * Discover authoritative nameservers for the domain
     */
    private discoverAuthoritativeServers;
    /**
     * Calculate overall result state based on query results
     */
    private calculateResultState;
    /**
     * Store results in database
     */
    private storeResults;
    /**
     * Map error message to collection status
     */
    private mapErrorToStatus;
    /**
     * Create RecordSets from normalized observations
     */
    private createRecordSetsFromObservations;
}
//# sourceMappingURL=collector.d.ts.map