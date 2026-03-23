/**
 * Remediation Request Schema
 *
 * Tracks remediation requests for mail configuration issues.
 * Allows operators to request fixes for DMARC/DKIM/SPF problems.
 *
 * ## Data Model Decision: snapshot_id as Soft Reference
 *
 * The `snapshot_id` column is a SOFT REFERENCE (no FK constraint) by design:
 *
 * ### Rationale
 * 1. **Lifecycle Independence**: Remediation requests have a longer lifecycle than
 *    snapshots. A remediation may span multiple snapshots as the domain is re-scanned.
 *
 * 2. **Snapshot Retention**: Snapshots may be archived or pruned for storage management.
 *    Hard FK would prevent cleanup or require cascading which loses audit trail.
 *
 * 3. **Request Origin Flexibility**: Remediations can be created:
 *    - From a specific snapshot (snapshot_id set)
 *    - From external systems (snapshot_id null)
 *    - From manual entry (snapshot_id null)
 *
 * 4. **Circular Dependency Avoidance**: The remediation module is intentionally
 *    decoupled from the core snapshot module to enable independent deployment.
 *
 * ### Application-Level Integrity
 * - The application layer validates snapshot_id when provided
 * - UI displays "snapshot unavailable" if referenced snapshot is deleted
 * - Reports join on snapshot_id with LEFT JOIN to handle missing references
 *
 * ### Alternative Considered
 * Adding FK with ON DELETE SET NULL was considered but rejected because:
 * - Implicit nullification loses the audit trail of original snapshot association
 * - Application should decide how to handle orphaned references
 *
 * Decision Date: 2026-03-20
 * Decision Owner: dns-ops-1j4.4.3
 */

import { index, jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

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
    // SOFT REFERENCE: No FK constraint - see module docstring for rationale
    snapshotId: uuid('snapshot_id'),
    domain: varchar('domain', { length: 253 }).notNull(),

    // Contact information (validated)
    contactEmail: varchar('contact_email', { length: 254 }).notNull(),
    contactName: varchar('contact_name', { length: 100 }).notNull(),
    contactPhone: varchar('contact_phone', { length: 20 }),

    // Tenant / actor context
    tenantId: uuid('tenant_id').notNull(),
    createdBy: varchar('created_by', { length: 100 }).notNull(),

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
    tenantIdx: index('remediation_tenant_idx').on(table.tenantId),
    createdByIdx: index('remediation_created_by_idx').on(table.createdBy),
    createdAtIdx: index('remediation_created_at_idx').on(table.createdAt),
  })
);

export type RemediationRequest = typeof remediationRequests.$inferSelect;
export type NewRemediationRequest = typeof remediationRequests.$inferInsert;
