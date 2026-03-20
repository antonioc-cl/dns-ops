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