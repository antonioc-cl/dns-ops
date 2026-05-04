/**
 * Job Worker - Bead 19
 *
 * BullMQ worker that processes queued jobs:
 * - collect-domain: DNS collection for a single domain
 * - monitoring-refresh: Scheduled re-collection for monitored domains
 * - fleet-report: Batch reporting across domain inventory
 *
 * Start with WORKER_ENABLED=true environment variable.
 */
import { type Job } from 'bullmq';
import { type CollectDomainJobData, type FleetReportJobData, type MonitoringRefreshJobData } from './queue.js';
export declare function getDbAdapter(): import("@dns-ops/db").IDatabaseAdapter;
/**
 * Process domain collection job
 * Exported for testing
 */
export declare function processCollectDomain(job: Job<CollectDomainJobData>): Promise<{
    success: boolean;
    snapshotId?: string;
    error?: string;
}>;
/**
 * Process monitoring refresh job
 * Exported for testing
 */
export declare function processMonitoringRefresh(job: Job<MonitoringRefreshJobData>): Promise<{
    success: boolean;
    snapshotId?: string;
    queued?: number;
    error?: string;
}>;
/**
 * Process fleet report job
 * Exported for testing
 */
export declare function processFleetReport(job: Job<FleetReportJobData>): Promise<{
    success: boolean;
    reportId?: string;
    summary?: Record<string, unknown>;
    error?: string;
}>;
/**
 * Start all workers
 */
export declare function startWorkers(): Promise<void>;
/**
 * Stop all workers gracefully
 */
export declare function stopWorkers(): Promise<void>;
/**
 * Check if workers are running
 */
export declare function workersRunning(): boolean;
//# sourceMappingURL=worker.d.ts.map