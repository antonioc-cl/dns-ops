/**
 * Remediation Request Schema
 *
 * Tracks remediation requests for mail configuration issues.
 * Allows operators to request fixes for DMARC/DKIM/SPF problems.
 */

import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  jsonb,
  text,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
// Note: snapshotId references snapshots.id but FK constraint removed to avoid circular dependency

export const remediationStatusEnum = pgEnum('remediation_status', [
  'open',
  'in-progress',
  'resolved',
  'closed',
]);

export const remediationPriorityEnum = pgEnum('remediation_priority', [
  'low',
  'medium',
  'high',
  'critical',
]);

export const remediationRequests = pgTable(
  'remediation_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    snapshotId: uuid('snapshot_id'), // References snapshots.id without FK constraint to avoid circular dependency
    domain: varchar('domain', { length: 253 }).notNull(),

    // Contact information (validated)
    contactEmail: varchar('contact_email', { length: 254 }).notNull(),
    contactName: varchar('contact_name', { length: 100 }).notNull(),
    contactPhone: varchar('contact_phone', { length: 20 }),

    // Issue classification
    issues: jsonb('issues').notNull().$type<string[]>(),
    priority: remediationPriorityEnum('priority').notNull().default('medium'),
    notes: text('notes'),

    // Status tracking
    status: remediationStatusEnum('status').notNull().default('open'),
    assignedTo: varchar('assigned_to', { length: 100 }),

    // Audit timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  },
  (table) => ({
    domainIdx: index('remediation_domain_idx').on(table.domain),
    statusIdx: index('remediation_status_idx').on(table.status),
    snapshotIdx: index('remediation_snapshot_idx').on(table.snapshotId),
    createdAtIdx: index('remediation_created_at_idx').on(table.createdAt),
  })
);

export type RemediationRequest = typeof remediationRequests.$inferSelect;
export type NewRemediationRequest = typeof remediationRequests.$inferInsert;
