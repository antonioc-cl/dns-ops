/**
 * Job Worker Processor Tests - Bead 19
 *
 * Tests for the exported processor functions:
 * - processCollectDomain
 * - processMonitoringRefresh  
 * - processFleetReport
 * 
 * NOTE: These tests are intentionally minimal because the processor functions
 * depend on many external services (DB, DNS, BullMQ) that require complex mocking.
 * The main integration tests are in monitoring.integration.test.ts and other e2e tests.
 */

import { describe, expect, it, vi } from 'vitest';

// Set up environment
global.process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';

// Mock all dependencies
vi.mock('@dns-ops/db', () => ({
  createPostgresAdapter: vi.fn().mockReturnValue({}),
  DomainRepository: vi.fn(),
  FindingRepository: vi.fn(),
  FleetReportRepository: vi.fn(),
  MonitoredDomainRepository: vi.fn(),
  SnapshotRepository: vi.fn(),
}));

vi.mock('../dns/collector.js', () => ({
  DNSCollector: vi.fn(),
}));

vi.mock('../middleware/error-tracking.js', () => ({
  getCollectorLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  }),
  trackJobStart: vi.fn(),
  trackJobComplete: vi.fn(),
  trackJobError: vi.fn(),
}));

vi.mock('./alert-from-findings.js', () => ({
  generateAlertsFromFindings: vi.fn().mockResolvedValue([]),
}));

vi.mock('./queue.js', () => ({
  getRedisConnection: vi.fn().mockReturnValue({}),
  scheduleMonitoringJob: vi.fn().mockResolvedValue('job-123'),
  getCollectionQueue: vi.fn().mockReturnValue({
    add: vi.fn().mockResolvedValue({ id: 'queued-job-123' }),
  }),
  QUEUE_NAMES: {
    COLLECTION: 'dns-ops:collection',
    MONITORING: 'dns-ops:monitoring',
    REPORTS: 'dns-ops:reports',
  },
}));

// Import after mocks
import { processCollectDomain, processFleetReport, processMonitoringRefresh } from './worker.js';

describe('Job Worker Processors - Bead 19', () => {
  describe('processCollectDomain', () => {
    it('should be exported as a function', () => {
      expect(typeof processCollectDomain).toBe('function');
    });

    it('should return error when DATABASE_URL not set', async () => {
      const originalEnv = process.env.DATABASE_URL;
      delete process.env.DATABASE_URL;

      const job = {
        id: 'job-1',
        data: { tenantId: 't1', domain: 'example.com', triggeredBy: 'user' },
        updateProgress: vi.fn().mockResolvedValue(undefined),
      };

      const result = await processCollectDomain(job as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('DATABASE_URL');

      process.env.DATABASE_URL = originalEnv;
    });
  });

  describe('processMonitoringRefresh', () => {
    it('should be exported as a function', () => {
      expect(typeof processMonitoringRefresh).toBe('function');
    });

    it('should return error when DATABASE_URL not set', async () => {
      const originalEnv = process.env.DATABASE_URL;
      delete process.env.DATABASE_URL;

      const job = {
        id: 'job-2',
        data: { 
          monitoredDomainId: 'm1',
          domainId: 'd1', 
          domainName: 'example.com',
          schedule: 'daily',
          tenantId: 't1' 
        },
        updateProgress: vi.fn().mockResolvedValue(undefined),
      };

      const result = await processMonitoringRefresh(job as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('DATABASE_URL');

      process.env.DATABASE_URL = originalEnv;
    });
  });

  describe('processFleetReport', () => {
    it('should be exported as a function', () => {
      expect(typeof processFleetReport).toBe('function');
    });

    it('should return error when DATABASE_URL not set', async () => {
      const originalEnv = process.env.DATABASE_URL;
      delete process.env.DATABASE_URL;

      const job = {
        id: 'job-3',
        data: { 
          inventory: ['example.com'],
          checks: ['spf'],
          triggeredBy: 'user',
          tenantId: 't1'
        },
        updateProgress: vi.fn().mockResolvedValue(undefined),
      };

      const result = await processFleetReport(job as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('DATABASE_URL');

      process.env.DATABASE_URL = originalEnv;
    });
  });
});
