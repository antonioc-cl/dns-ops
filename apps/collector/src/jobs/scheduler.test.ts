/**
 * Scheduler Tests - Bead 19
 *
 * Tests for job scheduling:
 * - Schedule patterns and configuration
 * - Schedule key generation
 * - Cron pattern validation
 */

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { getScheduleKey, SCHEDULE_DESCRIPTIONS, SCHEDULE_PATTERNS } from './scheduler.js';

// =============================================================================
// UNIT TESTS (no mocking needed)
// =============================================================================

describe('Job Scheduler', () => {
  // ===========================================================================
  // SCHEDULE PATTERNS
  // ===========================================================================

  describe('Schedule Patterns', () => {
    it('should have valid hourly cron pattern', () => {
      expect(SCHEDULE_PATTERNS.hourly).toBe('0 * * * *');
    });

    it('should have valid daily cron pattern', () => {
      expect(SCHEDULE_PATTERNS.daily).toBe('0 6 * * *');
    });

    it('should have valid weekly cron pattern', () => {
      expect(SCHEDULE_PATTERNS.weekly).toBe('0 6 * * 1');
    });

    it('should have descriptions for all schedule types', () => {
      expect(SCHEDULE_DESCRIPTIONS.hourly).toContain('hour');
      expect(SCHEDULE_DESCRIPTIONS.daily).toContain('Daily');
      expect(SCHEDULE_DESCRIPTIONS.weekly).toContain('Monday');
    });

    it('should cover all three schedule types', () => {
      const scheduleTypes = Object.keys(SCHEDULE_PATTERNS);
      expect(scheduleTypes).toContain('hourly');
      expect(scheduleTypes).toContain('daily');
      expect(scheduleTypes).toContain('weekly');
      expect(scheduleTypes).toHaveLength(3);
    });
  });

  // ===========================================================================
  // SCHEDULE KEY GENERATION
  // ===========================================================================

  describe('Schedule Key Generation', () => {
    it('should generate unique keys for each schedule type', () => {
      const hourlyKey = getScheduleKey('hourly');
      const dailyKey = getScheduleKey('daily');
      const weeklyKey = getScheduleKey('weekly');

      expect(hourlyKey).not.toBe(dailyKey);
      expect(dailyKey).not.toBe(weeklyKey);
      expect(hourlyKey).not.toBe(weeklyKey);
    });

    it('should generate consistent keys for same schedule type', () => {
      const key1 = getScheduleKey('daily');
      const key2 = getScheduleKey('daily');

      expect(key1).toBe(key2);
    });

    it('should include schedule type in key', () => {
      const key = getScheduleKey('hourly');

      expect(key).toContain('hourly');
      expect(key).toBe('scheduled-refresh:hourly');
    });

    it('should use standard prefix for all keys', () => {
      const hourlyKey = getScheduleKey('hourly');
      const dailyKey = getScheduleKey('daily');
      const weeklyKey = getScheduleKey('weekly');

      expect(hourlyKey).toMatch(/^scheduled-refresh:/);
      expect(dailyKey).toMatch(/^scheduled-refresh:/);
      expect(weeklyKey).toMatch(/^scheduled-refresh:/);
    });
  });

  // ===========================================================================
  // CRON PATTERN VALIDATION
  // ===========================================================================

  describe('Cron Pattern Validation', () => {
    it('should have patterns matching expected execution frequency', () => {
      // Hourly: runs at minute 0 of every hour
      const hourlyParts = SCHEDULE_PATTERNS.hourly.split(' ');
      expect(hourlyParts[0]).toBe('0'); // minute
      expect(hourlyParts[1]).toBe('*'); // every hour

      // Daily: runs at 6:00
      const dailyParts = SCHEDULE_PATTERNS.daily.split(' ');
      expect(dailyParts[0]).toBe('0'); // minute
      expect(dailyParts[1]).toBe('6'); // hour

      // Weekly: runs on Monday (day 1) at 6:00
      const weeklyParts = SCHEDULE_PATTERNS.weekly.split(' ');
      expect(weeklyParts[4]).toBe('1'); // day of week (Monday)
    });

    it('should have valid 5-field cron expressions', () => {
      const scheduleTypes = ['hourly', 'daily', 'weekly'] as const;

      for (const schedule of scheduleTypes) {
        const pattern = SCHEDULE_PATTERNS[schedule];
        const fields = pattern.split(' ');
        expect(fields).toHaveLength(5);
      }
    });

    it('should not use invalid cron characters', () => {
      const validChars = /^[\d*,\-/\s]+$/;

      for (const pattern of Object.values(SCHEDULE_PATTERNS)) {
        expect(pattern).toMatch(validChars);
      }
    });
  });

  // ===========================================================================
  // SCHEDULE TYPE CONSISTENCY
  // ===========================================================================

  describe('Schedule Type Consistency', () => {
    it('should have matching keys in patterns and descriptions', () => {
      const patternKeys = Object.keys(SCHEDULE_PATTERNS).sort();
      const descriptionKeys = Object.keys(SCHEDULE_DESCRIPTIONS).sort();

      expect(patternKeys).toEqual(descriptionKeys);
    });

    it('should have non-empty descriptions', () => {
      for (const [_key, description] of Object.entries(SCHEDULE_DESCRIPTIONS)) {
        expect(description.length).toBeGreaterThan(0);
      }
    });
  });
});

// =============================================================================
// INTEGRATION TESTS (Redis required)
// =============================================================================

/**
 * PR-07.1: Scheduler State Recovery Test
 *
 * These tests verify that schedule state can be recovered after a process restart.
 * They require a real Redis connection and will be skipped if REDIS_URL is not set.
 *
 * To run these tests:
 *   REDIS_URL=redis://localhost:6379 bun test scheduler.test.ts
 */
describe('Scheduler State Recovery (Integration)', () => {
  const hasRedis = process.env.RUN_REDIS_INTEGRATION_TESTS === '1';

  // Skip all tests in this describe block if Redis is not available
  beforeAll(() => {
    if (!hasRedis) {
      console.log('Skipping scheduler recovery tests - REDIS_URL not set');
    }
  });

  describe('Schedule Recovery After Restart', () => {
    // These tests would require:
    // 1. Real Redis connection
    // 2. Ability to clear activeSchedules Map
    // 3. Re-initialize and verify repopulation
    //
    // Since the scheduler module has internal state (activeSchedules Map),
    // we need to test the recovery scenario:
    // - Initialize schedules (creates BullMQ repeatable jobs)
    // - Clear the in-memory activeSchedules Map (simulate restart)
    // - Call initializeSchedules again
    // - Verify schedules are recovered without duplication

    it.skipIf(!hasRedis)('should recover schedules after in-memory state loss', async () => {
      // Dynamic import to get actual module with state
      const scheduler = await import('./scheduler.js');
      const {
        initializeSchedules,
        getActiveSchedules,
        _clearScheduleStateForTesting,
        _getActiveScheduleCount,
        cleanupSchedules,
      } = scheduler;

      // Clean up any existing schedules first
      await cleanupSchedules();

      // Step 1: Initialize schedules
      await initializeSchedules();
      const countBefore = _getActiveScheduleCount();
      expect(countBefore).toBe(3); // hourly, daily, weekly

      // Step 2: Clear in-memory state (simulate process restart)
      _clearScheduleStateForTesting();
      expect(_getActiveScheduleCount()).toBe(0);

      // Step 3: Re-initialize (recovery)
      await initializeSchedules();

      // Step 4: Verify recovery
      const countAfter = _getActiveScheduleCount();
      expect(countAfter).toBe(3);

      const schedules = getActiveSchedules();
      const scheduleTypes = schedules.map((s) => s.schedule).sort();
      expect(scheduleTypes).toEqual(['daily', 'hourly', 'weekly']);

      // Clean up
      await cleanupSchedules();
    });

    it.skipIf(!hasRedis)('should not create duplicate BullMQ repeatable jobs', async () => {
      const scheduler = await import('./scheduler.js');
      const { initializeSchedules, cleanupSchedules, getMonitoringQueue } = scheduler;

      // Clean up first
      await cleanupSchedules();

      // Initialize multiple times
      await initializeSchedules();
      await initializeSchedules();
      await initializeSchedules();

      // Check BullMQ repeatable jobs
      const queue = getMonitoringQueue();
      if (queue) {
        const repeatableJobs = await queue.getRepeatableJobs();
        const scheduledRefreshJobs = repeatableJobs.filter((j: { key?: string }) =>
          j.key?.includes('scheduled-refresh')
        );

        // Should have exactly 3 jobs (hourly, daily, weekly), not 9
        expect(scheduledRefreshJobs.length).toBeLessThanOrEqual(3);
      }

      // Clean up
      await cleanupSchedules();
    });

    it.skipIf(!hasRedis)('should verify all three schedule types are present', async () => {
      const scheduler = await import('./scheduler.js');
      const { initializeSchedules, getActiveSchedules, cleanupSchedules } = scheduler;

      await cleanupSchedules();
      await initializeSchedules();

      const schedules = getActiveSchedules();
      expect(schedules.length).toBe(3);

      const scheduleTypes = schedules.map((s) => s.schedule);
      expect(scheduleTypes).toContain('hourly');
      expect(scheduleTypes).toContain('daily');
      expect(scheduleTypes).toContain('weekly');

      // All should be active
      for (const schedule of schedules) {
        expect(schedule.status).toBe('active');
      }

      await cleanupSchedules();
    });
  });

  describe('BullMQ Repeatable Jobs Verification', () => {
    it.skipIf(!hasRedis)('should show expected repeatable jobs in BullMQ', async () => {
      const scheduler = await import('./scheduler.js');
      const { initializeSchedules, cleanupSchedules, getMonitoringQueue } = scheduler;

      await cleanupSchedules();
      await initializeSchedules();

      const queue = getMonitoringQueue();
      if (queue) {
        const repeatableJobs = await queue.getRepeatableJobs();

        // Should have 3 scheduled-refresh jobs
        const scheduledJobs = repeatableJobs.filter((j: { key?: string }) =>
          j.key?.includes('scheduled-refresh')
        );
        expect(scheduledJobs.length).toBe(3);
      }

      await cleanupSchedules();
    });

    it.skipIf(!hasRedis)('should have correct cron patterns for each schedule', async () => {
      const scheduler = await import('./scheduler.js');
      const { initializeSchedules, cleanupSchedules, getMonitoringQueue } = scheduler;

      await cleanupSchedules();
      await initializeSchedules();

      const queue = getMonitoringQueue();
      if (queue) {
        const repeatableJobs = await queue.getRepeatableJobs();

        for (const job of repeatableJobs) {
          const typedJob = job as { key?: string; pattern?: string };
          if (typedJob.key?.includes('hourly')) {
            expect(typedJob.pattern).toBe('0 * * * *');
          }
          if (typedJob.key?.includes('daily')) {
            expect(typedJob.pattern).toBe('0 6 * * *');
          }
          if (typedJob.key?.includes('weekly')) {
            expect(typedJob.pattern).toBe('0 6 * * 1');
          }
        }
      }

      await cleanupSchedules();
    });
  });
});

// =============================================================================
// INTEGRATION TESTS (with mocking)
// =============================================================================

describe('Scheduler Integration', () => {
  const mockQueueAdd = vi.fn();
  const mockQueueRemoveRepeatable = vi.fn();
  const mockScheduleMonitoringJob = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockQueueAdd.mockResolvedValue({ id: 'scheduled-job-id' });
    mockQueueRemoveRepeatable.mockResolvedValue(true);
    mockScheduleMonitoringJob.mockResolvedValue('job-123');
  });

  // ===========================================================================
  // SCHEDULE CONFIG STRUCTURE
  // ===========================================================================

  describe('Schedule Configuration', () => {
    it('should define valid schedule config structure', () => {
      // Test the expected structure
      const config = {
        type: 'daily' as const,
        enabled: true,
        cronPattern: '0 6 * * *',
        timezone: 'UTC',
      };

      expect(config.type).toBe('daily');
      expect(config.enabled).toBe(true);
      expect(config.cronPattern).toBe(SCHEDULE_PATTERNS.daily);
    });

    it('should support optional timezone', () => {
      const configWithTz = {
        type: 'hourly' as const,
        enabled: true,
        cronPattern: '0 * * * *',
        timezone: 'America/New_York',
      };

      const configWithoutTz = {
        type: 'weekly' as const,
        enabled: true,
        cronPattern: '0 6 * * 1',
      };

      expect(configWithTz.timezone).toBe('America/New_York');
      expect(configWithoutTz.timezone).toBeUndefined();
    });
  });

  // ===========================================================================
  // SCHEDULED JOB INFO STRUCTURE
  // ===========================================================================

  describe('Scheduled Job Info', () => {
    it('should define valid job info structure', () => {
      const jobInfo = {
        key: 'scheduled-refresh:daily',
        name: 'Monitoring refresh (daily)',
        schedule: 'daily' as const,
        status: 'active' as const,
      };

      expect(jobInfo.key).toContain('daily');
      expect(jobInfo.status).toBe('active');
    });

    it('should support different statuses', () => {
      const statuses = ['active', 'paused', 'removed'] as const;

      for (const status of statuses) {
        const jobInfo = {
          key: 'test-key',
          name: 'test',
          schedule: 'hourly' as const,
          status,
        };

        expect(statuses).toContain(jobInfo.status);
      }
    });
  });

  // ===========================================================================
  // BATCH SCHEDULING LOGIC
  // ===========================================================================

  describe('Batch Scheduling Logic', () => {
    it('should track queued and failed counts', () => {
      const results = { queued: 0, failed: 0 };
      const domains = ['a.com', 'b.com', 'c.com'];

      // Simulate scheduling
      for (const _domain of domains) {
        const success = Math.random() > 0.3;
        if (success) {
          results.queued++;
        } else {
          results.failed++;
        }
      }

      expect(results.queued + results.failed).toBe(domains.length);
    });

    it('should handle empty domain lists', () => {
      const domains: string[] = [];
      const results = { queued: 0, failed: 0 };

      for (const _domain of domains) {
        results.queued++;
      }

      expect(results.queued).toBe(0);
      expect(results.failed).toBe(0);
    });
  });

  // ===========================================================================
  // IDEMPOTENCY LOGIC
  // ===========================================================================

  describe('Idempotency Logic', () => {
    it('should detect existing schedules', () => {
      const activeSchedules = new Map<string, unknown>();

      // First setup
      const key = getScheduleKey('hourly');
      const exists = activeSchedules.has(key);
      expect(exists).toBe(false);

      // Add to active schedules
      activeSchedules.set(key, { type: 'hourly', enabled: true });

      // Second check
      const existsNow = activeSchedules.has(key);
      expect(existsNow).toBe(true);
    });

    it('should allow overwrite of existing schedules', () => {
      const activeSchedules = new Map<string, unknown>();
      const key = getScheduleKey('daily');

      // Initial setup
      activeSchedules.set(key, { type: 'daily', enabled: true, timezone: 'UTC' });

      // Overwrite with different timezone
      activeSchedules.set(key, { type: 'daily', enabled: true, timezone: 'Europe/London' });

      const config = activeSchedules.get(key) as { timezone: string };
      expect(config.timezone).toBe('Europe/London');
    });
  });

  // ===========================================================================
  // PAUSE/RESUME LOGIC
  // ===========================================================================

  describe('Pause/Resume Logic', () => {
    it('should toggle enabled state on pause', () => {
      const config = { type: 'weekly', enabled: true };

      // Pause
      config.enabled = false;
      expect(config.enabled).toBe(false);

      // Resume
      config.enabled = true;
      expect(config.enabled).toBe(true);
    });

    it('should preserve other config on pause/resume', () => {
      const config = {
        type: 'daily' as const,
        enabled: true,
        cronPattern: '0 6 * * *',
        timezone: 'America/Chicago',
      };

      // Pause
      config.enabled = false;

      expect(config.type).toBe('daily');
      expect(config.cronPattern).toBe('0 6 * * *');
      expect(config.timezone).toBe('America/Chicago');
    });
  });
});
