/**
 * Parity Evidence Schema - Bead 12
 *
 * Durable persistence for shadow comparison and parity evidence:
 * - Shadow comparisons: Legacy vs new system comparisons
 * - Legacy access logs: Audit trail for legacy tool access
 * - Provider baselines: Reference data for provider templates
 *
 * This schema ensures parity evidence survives process restarts
 * and provides historical data for cutover decisions.
 */

import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { snapshots } from './index.js';

// =============================================================================
// ENUMS
// =============================================================================

/**
 * Shadow comparison overall status
 */
export const shadowStatusEnum = pgEnum('shadow_status', [
  'match',
  'mismatch',
  'partial-match',
  'error',
]);

/**
 * Field comparison status
 */
export const fieldComparisonStatusEnum = pgEnum('field_comparison_status', [
  'match',
  'mismatch',
  'missing-in-legacy',
  'missing-in-new',
  'not-comparable',
]);

/**
 * Adjudication decision for mismatches
 */
export const adjudicationEnum = pgEnum('adjudication_decision', [
  'new-correct',
  'legacy-correct',
  'both-wrong',
  'acceptable-difference',
]);

/**
 * Legacy tool type
 */
export const legacyToolTypeEnum = pgEnum('legacy_tool_type', [
  'dmarc-check',
  'dkim-check',
  'spf-check',
  'mx-check',
  'dns-check',
]);

/**
 * Provider baseline status
 */
export const baselineStatusEnum = pgEnum('baseline_status', ['active', 'deprecated', 'draft']);

// =============================================================================
// SHADOW COMPARISONS TABLE
// =============================================================================

/**
 * Durable storage for shadow comparisons between legacy tools and new system.
 * Each comparison compares a snapshot's findings against legacy tool output.
 */
export const shadowComparisons = pgTable(
  'shadow_comparisons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    snapshotId: uuid('snapshot_id')
      .notNull()
      .references(() => snapshots.id, { onDelete: 'cascade' }),

    // Domain being compared
    domain: varchar('domain', { length: 253 }).notNull(),

    // Comparison timestamp
    comparedAt: timestamp('compared_at', { withTimezone: true }).notNull().defaultNow(),

    // Overall status
    status: shadowStatusEnum('status').notNull(),

    // Field-by-field comparison results
    comparisons: jsonb('comparisons').notNull().$type<FieldComparison[]>(),

    // Aggregate metrics
    metrics: jsonb('metrics').notNull().$type<{
      totalFields: number;
      matchingFields: number;
      mismatchingFields: number;
      missingInNew: number;
      missingInLegacy: number;
    }>(),

    // Human-readable summary
    summary: text('summary').notNull(),

    // Legacy output that was compared (stored for audit)
    legacyOutput: jsonb('legacy_output').notNull().$type<LegacyToolOutput>(),

    // Adjudication (if any)
    acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
    acknowledgedBy: varchar('acknowledged_by', { length: 100 }),
    adjudication: adjudicationEnum('adjudication'),
    adjudicationNotes: text('adjudication_notes'),

    // Tenant scope (for future multi-tenancy)
    tenantId: uuid('tenant_id'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    snapshotIdx: index('shadow_comparison_snapshot_idx').on(table.snapshotId),
    domainIdx: index('shadow_comparison_domain_idx').on(table.domain),
    statusIdx: index('shadow_comparison_status_idx').on(table.status),
    adjudicationIdx: index('shadow_comparison_adjudication_idx').on(table.adjudication),
    comparedAtIdx: index('shadow_comparison_compared_at_idx').on(table.comparedAt),
    tenantIdx: index('shadow_comparison_tenant_idx').on(table.tenantId),
  })
);

// =============================================================================
// LEGACY ACCESS LOGS TABLE
// =============================================================================

/**
 * Durable audit log for legacy tool access.
 * Tracks when and how legacy tools are accessed for parity monitoring.
 */
export const legacyAccessLogs = pgTable(
  'legacy_access_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // What tool was accessed
    toolType: legacyToolTypeEnum('tool_type').notNull(),
    toolEndpoint: varchar('tool_endpoint', { length: 500 }),

    // Domain being checked
    domain: varchar('domain', { length: 253 }).notNull(),

    // Request context
    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
    requestedBy: varchar('requested_by', { length: 100 }),
    requestSource: varchar('request_source', { length: 50 }), // 'api', 'ui', 'scheduled'

    // Response details
    responseStatus: varchar('response_status', { length: 20 }), // 'success', 'error', 'timeout'
    responseTimeMs: jsonb('response_time_ms').$type<number>(),

    // Output summary (for mismatch detection)
    outputSummary: jsonb('output_summary').$type<{
      dmarcPresent?: boolean;
      dmarcValid?: boolean;
      spfPresent?: boolean;
      spfValid?: boolean;
      dkimPresent?: boolean;
      dkimValid?: boolean;
    }>(),

    // Raw output (optional, for debugging)
    rawOutput: text('raw_output'),

    // Associated snapshot if comparison was triggered
    snapshotId: uuid('snapshot_id').references(() => snapshots.id, { onDelete: 'set null' }),

    // Tenant scope
    tenantId: uuid('tenant_id'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    toolTypeIdx: index('legacy_access_tool_type_idx').on(table.toolType),
    domainIdx: index('legacy_access_domain_idx').on(table.domain),
    requestedAtIdx: index('legacy_access_requested_at_idx').on(table.requestedAt),
    snapshotIdx: index('legacy_access_snapshot_idx').on(table.snapshotId),
    tenantIdx: index('legacy_access_tenant_idx').on(table.tenantId),
  })
);

// =============================================================================
// PROVIDER BASELINES TABLE
// =============================================================================

/**
 * Read-only provider template baselines.
 * Reference data for expected mail configuration by provider.
 * These are NOT tenant-editable - they're maintained as system reference data.
 */
export const providerBaselines = pgTable(
  'provider_baselines',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Provider identification
    providerKey: varchar('provider_key', { length: 50 }).notNull(), // e.g., 'google-workspace', 'microsoft-365'
    providerName: varchar('provider_name', { length: 100 }).notNull(),

    // Baseline status
    status: baselineStatusEnum('status').notNull().default('active'),

    // Expected mail configuration baseline
    baseline: jsonb('baseline').notNull().$type<ProviderBaselineData>(),

    // DKIM selector patterns for this provider
    dkimSelectors: jsonb('dkim_selectors').$type<string[]>(),

    // MX patterns
    mxPatterns: jsonb('mx_patterns').$type<string[]>(),

    // SPF includes
    spfIncludes: jsonb('spf_includes').$type<string[]>(),

    // Documentation/notes
    notes: text('notes'),
    documentationUrl: varchar('documentation_url', { length: 500 }),

    // Version tracking
    version: varchar('version', { length: 20 }).notNull().default('1.0.0'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    providerKeyIdx: index('provider_baseline_provider_key_idx').on(table.providerKey),
    statusIdx: index('provider_baseline_status_idx').on(table.status),
  })
);

// =============================================================================
// MISMATCH REPORTS TABLE
// =============================================================================

/**
 * Aggregated mismatch reports for cutover decisions.
 * Summarizes mismatches over time for a domain or tenant.
 */
export const mismatchReports = pgTable(
  'mismatch_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Report scope
    domain: varchar('domain', { length: 253 }),
    tenantId: uuid('tenant_id'),

    // Report period
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),

    // Aggregate statistics
    totalComparisons: jsonb('total_comparisons').$type<number>().notNull(),
    matchCount: jsonb('match_count').$type<number>().notNull(),
    mismatchCount: jsonb('mismatch_count').$type<number>().notNull(),
    partialMatchCount: jsonb('partial_match_count').$type<number>().notNull(),

    // Mismatch breakdown by field
    mismatchBreakdown: jsonb('mismatch_breakdown').$type<{
      dmarcPresent: number;
      dmarcValid: number;
      dmarcPolicy: number;
      spfPresent: number;
      spfValid: number;
      dkimPresent: number;
      dkimValid: number;
    }>(),

    // Adjudication summary
    adjudicatedCount: jsonb('adjudicated_count').$type<number>(),
    pendingCount: jsonb('pending_count').$type<number>(),

    // Cutover readiness
    matchRate: varchar('match_rate', { length: 10 }), // e.g., '95.5%'
    cutoverReady: boolean('cutover_ready').notNull().default(false),
    cutoverNotes: text('cutover_notes'),

    generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
    generatedBy: varchar('generated_by', { length: 100 }),
  },
  (table) => ({
    domainIdx: index('mismatch_report_domain_idx').on(table.domain),
    tenantIdx: index('mismatch_report_tenant_idx').on(table.tenantId),
    periodIdx: index('mismatch_report_period_idx').on(table.periodStart, table.periodEnd),
    cutoverIdx: index('mismatch_report_cutover_idx').on(table.cutoverReady),
  })
);

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface FieldComparison {
  field:
    | 'dmarc-present'
    | 'dmarc-valid'
    | 'dmarc-policy'
    | 'spf-present'
    | 'spf-valid'
    | 'dkim-present'
    | 'dkim-valid'
    | 'dkim-selector';
  legacyValue: string | boolean | null;
  newValue: string | boolean | null;
  status: 'match' | 'mismatch' | 'missing-in-legacy' | 'missing-in-new' | 'not-comparable';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  explanation: string;
}

export interface LegacyToolOutput {
  domain: string;
  checkedAt: Date | string;
  dmarc: {
    present: boolean;
    valid: boolean;
    policy?: string;
    record?: string;
    errors?: string[];
  };
  spf: {
    present: boolean;
    valid: boolean;
    record?: string;
    errors?: string[];
  };
  dkim: {
    present: boolean;
    valid: boolean;
    selector?: string;
    record?: string;
    errors?: string[];
  };
  rawOutput?: string;
}

export interface ProviderBaselineData {
  // Expected DMARC configuration
  dmarc?: {
    expectedPolicy?: 'none' | 'quarantine' | 'reject';
    requiresRua?: boolean;
    commonRecordPattern?: string;
  };

  // Expected SPF configuration
  spf?: {
    requiredIncludes?: string[];
    optionalIncludes?: string[];
    commonMechanisms?: string[];
  };

  // Expected DKIM configuration
  dkim?: {
    requiredSelectors?: string[];
    optionalSelectors?: string[];
    keySize?: number;
    keyType?: 'rsa' | 'ed25519';
  };

  // Expected MX configuration
  mx?: {
    expectedHosts?: string[];
    hostPatterns?: string[];
    priority?: number;
  };
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type ShadowComparison = typeof shadowComparisons.$inferSelect;
export type NewShadowComparison = typeof shadowComparisons.$inferInsert;

export type LegacyAccessLog = typeof legacyAccessLogs.$inferSelect;
export type NewLegacyAccessLog = typeof legacyAccessLogs.$inferInsert;

export type ProviderBaseline = typeof providerBaselines.$inferSelect;
export type NewProviderBaseline = typeof providerBaselines.$inferInsert;

export type MismatchReport = typeof mismatchReports.$inferSelect;
export type NewMismatchReport = typeof mismatchReports.$inferInsert;
