/**
 * Job Scheduler - Bead 19
 *
 * Handles idempotent scheduling of recurring jobs:
 * - Monitoring refresh schedules (hourly, daily, weekly)
 * - Prevents duplicate scheduled jobs
 * - Tracks schedule state for observability
 */
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
/**
 * Cron patterns for different schedule types
 * All times are in UTC by default
 */
export declare const SCHEDULE_PATTERNS: Record<ScheduleType, string>;
/**
 * Human-readable descriptions for schedule types
 */
export declare const SCHEDULE_DESCRIPTIONS: Record<ScheduleType, string>;
/**
 * Generate a unique schedule key
 */
export declare function getScheduleKey(schedule: ScheduleType): string;
/**
 * Set up a monitoring schedule (idempotent)
 * If schedule already exists with same config, returns existing
 */
export declare function setupSchedule(schedule: ScheduleType, options?: {
    timezone?: string;
    overwrite?: boolean;
}): Promise<{
    created: boolean;
    key: string;
    config: ScheduleConfig;
}>;
/**
 * Remove a monitoring schedule
 */
export declare function removeSchedule(schedule: ScheduleType): Promise<boolean>;
/**
 * Pause a schedule (keeps configuration but stops execution)
 */
export declare function pauseSchedule(schedule: ScheduleType): Promise<boolean>;
/**
 * Resume a paused schedule
 */
export declare function resumeSchedule(schedule: ScheduleType): Promise<boolean>;
/**
 * Get all active schedules
 */
export declare function getActiveSchedules(): ScheduledJobInfo[];
/**
 * Get schedule configuration
 */
export declare function getScheduleConfig(schedule: ScheduleType): ScheduleConfig | undefined;
/**
 * Check if a schedule is active
 */
export declare function isScheduleActive(schedule: ScheduleType): boolean;
/**
 * Schedule refresh for all monitored domains of a given schedule type
 * This is called by the scheduled job processor
 */
export declare function scheduleMonitoredDomainRefreshes(schedule: ScheduleType, domains: Array<{
    monitoredDomainId: string;
    domainId: string;
    domainName: string;
    tenantId: string;
}>): Promise<{
    queued: number;
    failed: number;
}>;
/**
 * Initialize all default schedules
 * Call this on worker startup
 */
export declare function initializeSchedules(): Promise<void>;
/**
 * Clean up all schedules
 * Call this on graceful shutdown
 */
export declare function cleanupSchedules(): Promise<void>;
//# sourceMappingURL=scheduler.d.ts.map