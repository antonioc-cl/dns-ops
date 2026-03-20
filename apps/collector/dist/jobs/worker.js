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
import { createPostgresAdapter, DomainRepository, FindingRepository, SnapshotRepository, } from '@dns-ops/db';
import { Worker } from 'bullmq';
import { DNSCollector } from '../dns/collector.js';
import { getRedisConnection, QUEUE_NAMES, } from './queue.js';
// =============================================================================
// Database Helper
// =============================================================================
function getDbAdapter() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        throw new Error('DATABASE_URL not configured');
    }
    return createPostgresAdapter(dbUrl);
}
// =============================================================================
// Job Processors
// =============================================================================
/**
 * Process domain collection job
 */
async function processCollectDomain(job) {
    const { domain, zoneManagement, triggeredBy, includeMailRecords, dkimSelectors } = job.data;
    console.log(`[Worker] Processing collect-domain job for ${domain} (triggered by ${triggeredBy})`);
    try {
        const db = getDbAdapter();
        const config = {
            domain,
            zoneManagement: zoneManagement || 'unknown',
            recordTypes: ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'CAA'],
            triggeredBy,
            includeMailRecords: includeMailRecords ?? true,
            dkimSelectors: dkimSelectors || [],
        };
        const collector = new DNSCollector(config, db);
        const result = await collector.collect();
        await job.updateProgress(100);
        return {
            success: true,
            snapshotId: result.snapshotId,
        };
    }
    catch (error) {
        console.error(`[Worker] collect-domain failed for ${domain}:`, error);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
/**
 * Process monitoring refresh job
 */
async function processMonitoringRefresh(job) {
    const { monitoredDomainId, domainId, domainName, schedule } = job.data;
    // Handle scheduled placeholder jobs - these trigger batch refreshes
    if (monitoredDomainId === 'scheduled') {
        console.log(`[Worker] Processing scheduled ${schedule} monitoring refresh`);
        // For scheduled jobs, we would query monitored domains and queue individual refreshes
        // This is a simplified implementation - full implementation needs MonitoredDomainRepository queries
        return {
            success: true,
            queued: 0,
        };
    }
    console.log(`[Worker] Processing monitoring refresh for ${domainName} (${schedule})`);
    try {
        const db = getDbAdapter();
        const domainRepo = new DomainRepository(db);
        // Get domain to check zone management
        const domain = await domainRepo.findById(domainId);
        if (!domain) {
            throw new Error(`Domain ${domainId} not found`);
        }
        const config = {
            domain: domainName,
            zoneManagement: domain.zoneManagement || 'unknown',
            recordTypes: ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'CAA'],
            triggeredBy: `monitoring:${schedule}`,
            includeMailRecords: true,
        };
        const collector = new DNSCollector(config, db);
        const result = await collector.collect();
        await job.updateProgress(100);
        return {
            success: true,
            snapshotId: result.snapshotId,
        };
    }
    catch (error) {
        console.error(`[Worker] monitoring-refresh failed for ${domainName}:`, error);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
/**
 * Process fleet report job
 */
async function processFleetReport(job) {
    const { inventory, checks, triggeredBy } = job.data;
    console.log(`[Worker] Processing fleet report for ${inventory.length} domains (triggered by ${triggeredBy})`);
    try {
        const db = getDbAdapter();
        const domainRepo = new DomainRepository(db);
        const snapshotRepo = new SnapshotRepository(db);
        const findingRepo = new FindingRepository(db);
        let processed = 0;
        const results = [];
        for (const domainName of inventory) {
            const domain = await domainRepo.findByName(domainName);
            if (!domain)
                continue;
            const snapshots = await snapshotRepo.findByDomain(domain.id, 1);
            if (snapshots.length === 0)
                continue;
            const findings = await findingRepo.findBySnapshotId(snapshots[0].id);
            const severityCounts = {};
            for (const finding of findings) {
                severityCounts[finding.severity] = (severityCounts[finding.severity] || 0) + 1;
            }
            results.push({
                domain: domainName,
                findingsCount: findings.length,
                severityCounts,
            });
            processed++;
            await job.updateProgress(Math.round((processed / inventory.length) * 100));
        }
        const summary = {
            totalDomains: inventory.length,
            processedDomains: results.length,
            totalFindings: results.reduce((sum, r) => sum + r.findingsCount, 0),
            checksApplied: checks,
        };
        return {
            success: true,
            reportId: `report-${Date.now()}`,
            summary,
        };
    }
    catch (error) {
        console.error(`[Worker] fleet-report failed:`, error);
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
// =============================================================================
// Worker Setup
// =============================================================================
let collectionWorker = null;
let monitoringWorker = null;
let reportsWorker = null;
/**
 * Start all workers
 */
export async function startWorkers() {
    const connection = getRedisConnection();
    if (!connection) {
        console.warn('[Worker] Redis not available - workers not started');
        return;
    }
    console.log('[Worker] Starting job workers...');
    const connectionOptions = connection;
    // Collection worker
    collectionWorker = new Worker(QUEUE_NAMES.COLLECTION, async (job) => {
        return processCollectDomain(job);
    }, {
        connection: connectionOptions,
        concurrency: 5,
    });
    collectionWorker.on('completed', (job) => {
        console.log(`[Worker] Collection job ${job.id} completed`);
    });
    collectionWorker.on('failed', (job, error) => {
        console.error(`[Worker] Collection job ${job?.id} failed:`, error.message);
    });
    // Monitoring worker
    monitoringWorker = new Worker(QUEUE_NAMES.MONITORING, async (job) => {
        return processMonitoringRefresh(job);
    }, {
        connection: connectionOptions,
        concurrency: 3,
    });
    monitoringWorker.on('completed', (job) => {
        console.log(`[Worker] Monitoring job ${job.id} completed`);
    });
    monitoringWorker.on('failed', (job, error) => {
        console.error(`[Worker] Monitoring job ${job?.id} failed:`, error.message);
    });
    // Reports worker
    reportsWorker = new Worker(QUEUE_NAMES.REPORTS, async (job) => {
        return processFleetReport(job);
    }, {
        connection: connectionOptions,
        concurrency: 2,
    });
    reportsWorker.on('completed', (job) => {
        console.log(`[Worker] Reports job ${job.id} completed`);
    });
    reportsWorker.on('failed', (job, error) => {
        console.error(`[Worker] Reports job ${job?.id} failed:`, error.message);
    });
    console.log('[Worker] All workers started');
}
/**
 * Stop all workers gracefully
 */
export async function stopWorkers() {
    console.log('[Worker] Stopping workers...');
    const workers = [collectionWorker, monitoringWorker, reportsWorker];
    for (const worker of workers) {
        if (worker) {
            await worker.close();
        }
    }
    collectionWorker = null;
    monitoringWorker = null;
    reportsWorker = null;
    console.log('[Worker] All workers stopped');
}
/**
 * Check if workers are running
 */
export function workersRunning() {
    return collectionWorker !== null || monitoringWorker !== null || reportsWorker !== null;
}
//# sourceMappingURL=worker.js.map