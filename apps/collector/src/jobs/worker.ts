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

import {
  createPostgresAdapter,
  DomainRepository,
  FindingRepository,
  SnapshotRepository,
} from '@dns-ops/db';
import { type ConnectionOptions, type Job, Worker } from 'bullmq';
import { DNSCollector } from '../dns/collector.js';
import type { CollectionConfig } from '../dns/types.js';
import {
  getCollectorLogger,
  trackJobComplete,
  trackJobError,
  trackJobStart,
} from '../middleware/error-tracking.js';
import {
  type CollectDomainJobData,
  type FleetReportJobData,
  getRedisConnection,
  type MonitoringRefreshJobData,
  QUEUE_NAMES,
} from './queue.js';

const logger = getCollectorLogger();

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
async function processCollectDomain(job: Job<CollectDomainJobData>): Promise<{
  success: boolean;
  snapshotId?: string;
  error?: string;
}> {
  const { tenantId, domain, zoneManagement, triggeredBy, includeMailRecords, dkimSelectors } =
    job.data;
  const startTime = Date.now();

  trackJobStart({
    jobId: job.id || 'unknown',
    jobType: 'collect-domain',
    domain,
    triggeredBy,
  });

  try {
    const db = getDbAdapter();

    const config: CollectionConfig = {
      tenantId,
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

    trackJobComplete({
      jobId: job.id || 'unknown',
      jobType: 'collect-domain',
      domain,
      durationMs: Date.now() - startTime,
      result: 'success',
      snapshotId: result.snapshotId,
    });

    return {
      success: true,
      snapshotId: result.snapshotId,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    trackJobError(err, {
      jobId: job.id || 'unknown',
      jobType: 'collect-domain',
      domain,
      durationMs: Date.now() - startTime,
    });
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Process monitoring refresh job
 */
async function processMonitoringRefresh(job: Job<MonitoringRefreshJobData>): Promise<{
  success: boolean;
  snapshotId?: string;
  queued?: number;
  error?: string;
}> {
  const { monitoredDomainId, domainId, domainName, schedule } = job.data;
  const startTime = Date.now();

  // Handle scheduled placeholder jobs - these trigger batch refreshes
  if (monitoredDomainId === 'scheduled') {
    logger.info('Processing scheduled monitoring refresh', { schedule, jobId: job.id });
    // For scheduled jobs, we would query monitored domains and queue individual refreshes
    // This is a simplified implementation - full implementation needs MonitoredDomainRepository queries
    return {
      success: true,
      queued: 0,
    };
  }

  trackJobStart({
    jobId: job.id || 'unknown',
    jobType: 'monitoring-refresh',
    domain: domainName,
    schedule,
  });

  try {
    const db = getDbAdapter();
    const domainRepo = new DomainRepository(db);

    // Get domain to check zone management
    const domain = await domainRepo.findById(domainId);
    if (!domain) {
      throw new Error(`Domain ${domainId} not found`);
    }

    const config: CollectionConfig = {
      tenantId: job.data.tenantId,
      domain: domainName,
      zoneManagement: domain.zoneManagement || 'unknown',
      recordTypes: ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'CAA'],
      triggeredBy: `monitoring:${schedule}`,
      includeMailRecords: true,
    };

    const collector = new DNSCollector(config, db);
    const result = await collector.collect();

    await job.updateProgress(100);

    trackJobComplete({
      jobId: job.id || 'unknown',
      jobType: 'monitoring-refresh',
      domain: domainName,
      durationMs: Date.now() - startTime,
      result: 'success',
      snapshotId: result.snapshotId,
    });

    return {
      success: true,
      snapshotId: result.snapshotId,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    trackJobError(err, {
      jobId: job.id || 'unknown',
      jobType: 'monitoring-refresh',
      domain: domainName,
      durationMs: Date.now() - startTime,
    });
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Process fleet report job
 */
async function processFleetReport(job: Job<FleetReportJobData>): Promise<{
  success: boolean;
  reportId?: string;
  summary?: Record<string, unknown>;
  error?: string;
}> {
  const { inventory, checks, triggeredBy } = job.data;
  const startTime = Date.now();

  trackJobStart({
    jobId: job.id || 'unknown',
    jobType: 'fleet-report',
    triggeredBy,
    domainCount: inventory.length,
  });

  try {
    const db = getDbAdapter();
    const domainRepo = new DomainRepository(db);
    const snapshotRepo = new SnapshotRepository(db);
    const findingRepo = new FindingRepository(db);

    let processed = 0;
    const results: Array<{
      domain: string;
      findingsCount: number;
      severityCounts: Record<string, number>;
    }> = [];

    for (const domainName of inventory) {
      const domain = await domainRepo.findByName(domainName);
      if (!domain) continue;

      const snapshots = await snapshotRepo.findByDomain(domain.id, 1);
      if (snapshots.length === 0) continue;

      const findings = await findingRepo.findBySnapshotId(snapshots[0].id);

      const severityCounts: Record<string, number> = {};
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

    const reportId = `report-${Date.now()}`;

    trackJobComplete({
      jobId: job.id || 'unknown',
      jobType: 'fleet-report',
      durationMs: Date.now() - startTime,
      result: 'success',
      reportId,
      processedDomains: results.length,
      totalFindings: summary.totalFindings,
    });

    return {
      success: true,
      reportId,
      summary,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    trackJobError(err, {
      jobId: job.id || 'unknown',
      jobType: 'fleet-report',
      durationMs: Date.now() - startTime,
    });
    return {
      success: false,
      error: err.message,
    };
  }
}

// =============================================================================
// Worker Setup
// =============================================================================

let collectionWorker: Worker | null = null;
let monitoringWorker: Worker | null = null;
let reportsWorker: Worker | null = null;

/**
 * Start all workers
 */
export async function startWorkers(): Promise<void> {
  const connection = getRedisConnection();
  if (!connection) {
    logger.warn('Redis not available - workers not started');
    return;
  }

  logger.info('Starting job workers...');

  const connectionOptions: ConnectionOptions = connection as ConnectionOptions;

  // Collection worker
  collectionWorker = new Worker(
    QUEUE_NAMES.COLLECTION,
    async (job) => {
      return processCollectDomain(job as Job<CollectDomainJobData>);
    },
    {
      connection: connectionOptions,
      concurrency: 5,
    }
  );

  collectionWorker.on('completed', (job) => {
    logger.debug('Collection job completed', { jobId: job.id });
  });

  collectionWorker.on('failed', (job, error) => {
    logger.error('Collection job failed', error, { jobId: job?.id });
  });

  // Monitoring worker
  monitoringWorker = new Worker(
    QUEUE_NAMES.MONITORING,
    async (job) => {
      return processMonitoringRefresh(job as Job<MonitoringRefreshJobData>);
    },
    {
      connection: connectionOptions,
      concurrency: 3,
    }
  );

  monitoringWorker.on('completed', (job) => {
    logger.debug('Monitoring job completed', { jobId: job.id });
  });

  monitoringWorker.on('failed', (job, error) => {
    logger.error('Monitoring job failed', error, { jobId: job?.id });
  });

  // Reports worker
  reportsWorker = new Worker(
    QUEUE_NAMES.REPORTS,
    async (job) => {
      return processFleetReport(job as Job<FleetReportJobData>);
    },
    {
      connection: connectionOptions,
      concurrency: 2,
    }
  );

  reportsWorker.on('completed', (job) => {
    logger.debug('Reports job completed', { jobId: job.id });
  });

  reportsWorker.on('failed', (job, error) => {
    logger.error('Reports job failed', error, { jobId: job?.id });
  });

  logger.info('All workers started');
}

/**
 * Stop all workers gracefully
 */
export async function stopWorkers(): Promise<void> {
  logger.info('Stopping workers...');

  const workers = [collectionWorker, monitoringWorker, reportsWorker];

  for (const worker of workers) {
    if (worker) {
      await worker.close();
    }
  }

  collectionWorker = null;
  monitoringWorker = null;
  reportsWorker = null;

  logger.info('All workers stopped');
}

/**
 * Check if workers are running
 */
export function workersRunning(): boolean {
  return collectionWorker !== null || monitoringWorker !== null || reportsWorker !== null;
}
