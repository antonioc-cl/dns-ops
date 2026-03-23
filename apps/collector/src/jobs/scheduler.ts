/**
 * Job Scheduler - Bead 19
 *
 * Handles idempotent scheduling of recurring jobs:
 * - Monitoring refresh schedules (hourly, daily, weekly)
 * - Prevents duplicate scheduled jobs
 * - Tracks schedule state for observability
 */

import { getMonitoringQueue, scheduleMonitoringJob } from './queue.js';

// =============================================================================
// TYPES
// =============================================================================

export type ScheduleType = 'hourly' | 'daily' | 'weekly';

export interface ScheduleConfig {
  type: ScheduleType;
  enabled: boolean;
  cronPattern: string;
  timezone?: string;
}

export interface ScheduledJobInfo {
  key: string;
  name: string;
  nextRun?: Date;
  lastRun?: Date;
  schedule: ScheduleType;
  status: 'active' | 'paused' | 'removed';
}

// =============================================================================
// SCHEDULE PATTERNS
// =============================================================================

/**
 * Cron patterns for different schedule types
 * All times are in UTC by default
 */
export const SCHEDULE_PATTERNS: Record<ScheduleType, string> = {
  hourly: '0 * * * *', // Every hour at :00
  daily: '0 6 * * *', // Daily at 06:00 UTC
  weekly: '0 6 * * 1', // Monday at 06:00 UTC
};

/**
 * Human-readable descriptions for schedule types
 */
export const SCHEDULE_DESCRIPTIONS: Record<ScheduleType, string> = {
  hourly: 'Every hour at the top of the hour',
  daily: 'Daily at 06:00 UTC',
  weekly: 'Every Monday at 06:00 UTC',
};

// =============================================================================
// SCHEDULER STATE
// =============================================================================

// Track active schedules in memory.
// LIMITATION (V1): Schedule state is lost on process restart.
// BullMQ repeatable jobs survive in Redis, so jobs re-execute on schedule,
// but the activeSchedules Map (used for observability) resets.
// initializeSchedules() must be called on startup to repopulate.
const activeSchedules = new Map<string, ScheduleConfig>();

/**
 * Generate a unique schedule key
 */
export function getScheduleKey(schedule: ScheduleType): string {
  return `scheduled-refresh:${schedule}`;
}

// =============================================================================
// SCHEDULER FUNCTIONS
// =============================================================================

/**
 * Set up a monitoring schedule (idempotent)
 * If schedule already exists with same config, returns existing
 */
export async function setupSchedule(
  schedule: ScheduleType,
  options?: {
    timezone?: string;
    overwrite?: boolean;
  }
): Promise<{ created: boolean; key: string; config: ScheduleConfig }> {
  const key = getScheduleKey(schedule);
  const existingConfig = activeSchedules.get(key);

  // Check if schedule already exists
  if (existingConfig && !options?.overwrite) {
    return {
      created: false,
      key,
      config: existingConfig,
    };
  }

  const queue = getMonitoringQueue();
  if (!queue) {
    throw new Error('Monitoring queue not available');
  }

  const config: ScheduleConfig = {
    type: schedule,
    enabled: true,
    cronPattern: SCHEDULE_PATTERNS[schedule],
    timezone: options?.timezone || 'UTC',
  };

  // Remove existing if overwriting
  if (existingConfig && options?.overwrite) {
    await removeSchedule(schedule);
  }

  // Add repeatable job
  await queue.add(
    key,
    {
      monitoredDomainId: 'scheduled',
      domainId: 'scheduled',
      domainName: 'scheduled',
      schedule,
      tenantId: 'system',
    },
    {
      repeat: {
        pattern: config.cronPattern,
        tz: config.timezone,
      },
      jobId: key, // Ensures idempotency
    }
  );

  activeSchedules.set(key, config);

  return {
    created: true,
    key,
    config,
  };
}

/**
 * Remove a monitoring schedule
 */
export async function removeSchedule(schedule: ScheduleType): Promise<boolean> {
  const key = getScheduleKey(schedule);
  const queue = getMonitoringQueue();

  if (!queue) {
    return false;
  }

  try {
    // Remove the repeatable job
    await queue.removeRepeatable(key, {
      pattern: SCHEDULE_PATTERNS[schedule],
    });

    activeSchedules.delete(key);
    return true;
  } catch (error) {
    console.error(`[Scheduler] Failed to remove schedule ${schedule}:`, error);
    return false;
  }
}

/**
 * Pause a schedule (keeps configuration but stops execution)
 */
export async function pauseSchedule(schedule: ScheduleType): Promise<boolean> {
  const key = getScheduleKey(schedule);
  const config = activeSchedules.get(key);

  if (!config) {
    return false;
  }

  // Remove the repeatable job but keep config
  const removed = await removeSchedule(schedule);
  if (removed) {
    activeSchedules.set(key, { ...config, enabled: false });
  }

  return removed;
}

/**
 * Resume a paused schedule
 */
export async function resumeSchedule(schedule: ScheduleType): Promise<boolean> {
  const key = getScheduleKey(schedule);
  const config = activeSchedules.get(key);

  if (!config || config.enabled) {
    return false;
  }

  const result = await setupSchedule(schedule, {
    timezone: config.timezone,
    overwrite: true,
  });

  return result.created;
}

/**
 * Get all active schedules
 */
export function getActiveSchedules(): ScheduledJobInfo[] {
  const schedules: ScheduledJobInfo[] = [];

  for (const [key, config] of activeSchedules.entries()) {
    schedules.push({
      key,
      name: `Monitoring refresh (${config.type})`,
      schedule: config.type,
      status: config.enabled ? 'active' : 'paused',
    });
  }

  return schedules;
}

/**
 * Get schedule configuration
 */
export function getScheduleConfig(schedule: ScheduleType): ScheduleConfig | undefined {
  const key = getScheduleKey(schedule);
  return activeSchedules.get(key);
}

/**
 * Check if a schedule is active
 */
export function isScheduleActive(schedule: ScheduleType): boolean {
  const config = getScheduleConfig(schedule);
  return config?.enabled ?? false;
}

// =============================================================================
// BATCH SCHEDULING
// =============================================================================

/**
 * Schedule refresh for all monitored domains of a given schedule type
 * This is called by the scheduled job processor
 */
export async function scheduleMonitoredDomainRefreshes(
  schedule: ScheduleType,
  domains: Array<{
    monitoredDomainId: string;
    domainId: string;
    domainName: string;
    tenantId: string;
  }>
): Promise<{ queued: number; failed: number }> {
  let queued = 0;
  let failed = 0;

  for (const domain of domains) {
    try {
      const jobId = await scheduleMonitoringJob({
        monitoredDomainId: domain.monitoredDomainId,
        domainId: domain.domainId,
        domainName: domain.domainName,
        schedule,
        tenantId: domain.tenantId,
      });

      if (jobId) {
        queued++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`[Scheduler] Failed to queue refresh for ${domain.domainName}:`, error);
      failed++;
    }
  }

  return { queued, failed };
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize all default schedules
 * Call this on worker startup
 */
export async function initializeSchedules(): Promise<void> {
  console.log('[Scheduler] Initializing monitoring schedules...');

  const scheduleTypes: ScheduleType[] = ['hourly', 'daily', 'weekly'];

  for (const schedule of scheduleTypes) {
    try {
      const result = await setupSchedule(schedule);
      if (result.created) {
        console.log(`[Scheduler] Created ${schedule} schedule`);
      } else {
        console.log(`[Scheduler] ${schedule} schedule already exists`);
      }
    } catch (error) {
      console.error(`[Scheduler] Failed to initialize ${schedule} schedule:`, error);
    }
  }

  console.log('[Scheduler] Initialization complete');
}

/**
 * Clean up all schedules
 * Call this on graceful shutdown
 */
export async function cleanupSchedules(): Promise<void> {
  console.log('[Scheduler] Cleaning up schedules...');

  const scheduleTypes: ScheduleType[] = ['hourly', 'daily', 'weekly'];

  for (const schedule of scheduleTypes) {
    await removeSchedule(schedule);
  }

  activeSchedules.clear();
  console.log('[Scheduler] Cleanup complete');
}
