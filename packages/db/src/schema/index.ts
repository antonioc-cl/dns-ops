/**
 * DNS Ops Workbench - Database Schema
 * 
 * Core entities for the persistence layer:
 * - Domain: DNS domains being monitored
 * - Snapshot: A point-in-time collection of DNS data
 * - Observation: Raw DNS query results (immutable)
 * - VantagePoint: Where queries originate from
 * - RecordSet: Normalized DNS records
 * - Finding: Analysis results from rules engine
 * - Suggestion: Recommended actions
 * - RulesetVersion: Version tracking for rules
 */

import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  jsonb,
  text,
  integer,
  boolean,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';

// Enums matching the contracts package
export const resultStateEnum = pgEnum('result_state', [
  'complete',
  'partial',
  'failed',
]);

export const severityEnum = pgEnum('severity', [
  'critical',
  'high',
  'medium',
  'low',
  'info',
]);

export const confidenceEnum = pgEnum('confidence', [
  'certain',
  'high',
  'medium',
  'low',
  'heuristic',
]);

export const riskPostureEnum = pgEnum('risk_posture', [
  'safe',
  'low',
  'medium',
  'high',
  'critical',
]);

export const blastRadiusEnum = pgEnum('blast_radius', [
  'none',
  'single-domain',
  'subdomain-tree',
  'related-domains',
  'infrastructure',
  'organization-wide',
]);

export const zoneManagementEnum = pgEnum('zone_management', [
  'managed',
  'unmanaged',
  'unknown',
]);

export const vantageTypeEnum = pgEnum('vantage_type', [
  'public-recursive',
  'authoritative',
  'parent-zone',
  'probe',
]);

export const collectionStatusEnum = pgEnum('collection_status', [
  'success',
  'timeout',
  'refused',
  'truncated',
  'nxdomain',
  'nodata',
  'error',
]);

// =============================================================================
// DOMAIN TABLE
// =============================================================================

export const domains = pgTable(
  'domains',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 253 }).notNull(),
    normalizedName: varchar('normalized_name', { length: 253 }).notNull(),
    punycodeName: varchar('punycode_name', { length: 253 }),
    zoneManagement: zoneManagementEnum('zone_management').notNull().default('unknown'),
    tenantId: uuid('tenant_id'), // Reserved for future multi-tenancy
    metadata: jsonb('metadata'), // Flexible metadata storage
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    nameIdx: uniqueIndex('domain_name_idx').on(table.normalizedName),
    tenantIdx: index('domain_tenant_idx').on(table.tenantId),
    zoneMgmtIdx: index('domain_zone_management_idx').on(table.zoneManagement),
  })
);

// =============================================================================
// RULESET VERSION TABLE
// =============================================================================

export const rulesetVersions = pgTable(
  'ruleset_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    version: varchar('version', { length: 50 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    rules: jsonb('rules').notNull(), // Serialized rule definitions
    active: boolean('active').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: varchar('created_by', { length: 100 }).notNull(),
  },
  (table) => ({
    versionIdx: uniqueIndex('ruleset_version_idx').on(table.version),
    activeIdx: index('ruleset_active_idx').on(table.active),
  })
);

// =============================================================================
// SNAPSHOT TABLE
// =============================================================================

export const snapshots = pgTable(
  'snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    domainId: uuid('domain_id')
      .notNull()
      .references(() => domains.id, { onDelete: 'cascade' }),
    domainName: varchar('domain_name', { length: 253 }).notNull(), // Denormalized for queries
    resultState: resultStateEnum('result_state').notNull(),
    
    // Snapshot scope - explicitly tracks what was queried
    queriedNames: jsonb('queried_names').notNull().$type<string[]>(),
    queriedTypes: jsonb('queried_types').notNull().$type<string[]>(),
    vantages: jsonb('vantages').notNull().$type<string[]>(),
    zoneManagement: zoneManagementEnum('zone_management').notNull(),
    
    // Ruleset version used for findings
    rulesetVersionId: uuid('ruleset_version_id')
      .references(() => rulesetVersions.id),
    
    // Metadata
    triggeredBy: varchar('triggered_by', { length: 100 }).notNull(), // user ID or 'system'
    collectionDurationMs: integer('collection_duration_ms'),
    errorMessage: text('error_message'),
    
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    domainIdx: index('snapshot_domain_idx').on(table.domainId),
    createdAtIdx: index('snapshot_created_at_idx').on(table.createdAt),
    domainCreatedIdx: index('snapshot_domain_created_idx').on(table.domainId, table.createdAt),
    stateIdx: index('snapshot_state_idx').on(table.resultState),
  })
);

// =============================================================================
// VANTAGE POINT TABLE
// =============================================================================

export const vantagePoints = pgTable(
  'vantage_points',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    type: vantageTypeEnum('type').notNull(),
    description: text('description'),
    
    // Configuration for this vantage
    config: jsonb('config').notNull(),
    
    // For authoritative vantages: NS hostnames
    // For recursive vantages: resolver addresses
    endpoints: jsonb('endpoints').notNull().$type<string[]>(),
    
    region: varchar('region', { length: 50 }),
    network: varchar('network', { length: 50 }),
    
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    typeIdx: index('vantage_type_idx').on(table.type),
    activeIdx: index('vantage_active_idx').on(table.isActive),
  })
);

// =============================================================================
// OBSERVATION TABLE (Immutable)
// =============================================================================

export const observations = pgTable(
  'observations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    snapshotId: uuid('snapshot_id')
      .notNull()
      .references(() => snapshots.id, { onDelete: 'cascade' }),
    
    // Query details
    queryName: varchar('query_name', { length: 253 }).notNull(),
    queryType: varchar('query_type', { length: 10 }).notNull(),
    
    // Vantage point used
    vantageId: uuid('vantage_id')
      .references(() => vantagePoints.id),
    vantageType: vantageTypeEnum('vantage_type').notNull(),
    vantageIdentifier: varchar('vantage_identifier', { length: 100 }), // Specific NS IP or resolver
    
    // Collection status
    status: collectionStatusEnum('status').notNull(),
    
    // Timing
    queriedAt: timestamp('queried_at', { withTimezone: true }).notNull().defaultNow(),
    responseTimeMs: integer('response_time_ms'),
    
    // DNS response details
    responseCode: integer('response_code'),
    flags: jsonb('flags'), // AA, TC, RD, RA, etc.
    
    // Raw sections (stored as JSON for flexibility)
    answerSection: jsonb('answer_section').$type<DNSRecord[]>(),
    authoritySection: jsonb('authority_section').$type<DNSRecord[]>(),
    additionalSection: jsonb('additional_section').$type<DNSRecord[]>(),
    
    // Error details
    errorMessage: text('error_message'),
    errorDetails: jsonb('error_details'),
    
    // Raw response for debugging (optional, may be large)
    rawResponse: text('raw_response'),
  },
  (table) => ({
    snapshotIdx: index('observation_snapshot_idx').on(table.snapshotId),
    queryIdx: index('observation_query_idx').on(table.queryName, table.queryType),
    vantageIdx: index('observation_vantage_idx').on(table.vantageId),
    statusIdx: index('observation_status_idx').on(table.status),
  })
);

// DNS Record structure for JSON fields
export interface DNSRecord {
  name: string;
  type: string;
  ttl: number;
  data: string;
  // Extended fields for specific types
  priority?: number; // MX, SRV
  mname?: string; // SOA
  rname?: string; // SOA
  serial?: number; // SOA
  refresh?: number; // SOA
  retry?: number; // SOA
  expire?: number; // SOA
  minimum?: number; // SOA
}

// =============================================================================
// RECORD SET TABLE (Normalized view of observations)
// =============================================================================

export const recordSets = pgTable(
  'record_sets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    snapshotId: uuid('snapshot_id')
      .notNull()
      .references(() => snapshots.id, { onDelete: 'cascade' }),
    
    // Record details
    name: varchar('name', { length: 253 }).notNull(),
    type: varchar('type', { length: 10 }).notNull(),
    ttl: integer('ttl'),
    
    // Values (multiple for records with same name/type)
    values: jsonb('values').notNull().$type<string[]>(),
    
    // Source observations that contributed to this record set
    sourceObservationIds: jsonb('source_observation_ids').notNull().$type<string[]>(),
    sourceVantages: jsonb('source_vantages').notNull().$type<string[]>(),
    
    // Consolidation metadata
    isConsistent: boolean('is_consistent').notNull(), // false if vantages disagree
    consolidationNotes: text('consolidation_notes'),
    
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    snapshotIdx: index('recordset_snapshot_idx').on(table.snapshotId),
    nameTypeIdx: index('recordset_name_type_idx').on(table.name, table.type),
  })
);

// =============================================================================
// FINDING TABLE
// =============================================================================

export const findings = pgTable(
  'findings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    snapshotId: uuid('snapshot_id')
      .notNull()
      .references(() => snapshots.id, { onDelete: 'cascade' }),
    
    // Finding classification
    type: varchar('type', { length: 100 }).notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description').notNull(),
    
    // Assessment
    severity: severityEnum('severity').notNull(),
    confidence: confidenceEnum('confidence').notNull(),
    riskPosture: riskPostureEnum('risk_posture').notNull(),
    blastRadius: blastRadiusEnum('blast_radius').notNull(),
    reviewOnly: boolean('review_only').notNull().default(false),
    
    // Evidence links
    evidence: jsonb('evidence').notNull().$type<EvidenceLink[]>(),
    
    // Rule that generated this finding
    ruleId: varchar('rule_id', { length: 100 }).notNull(),
    ruleVersion: varchar('rule_version', { length: 50 }).notNull(),
    
    // Finding state
    acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
    acknowledgedBy: varchar('acknowledged_by', { length: 100 }),
    falsePositive: boolean('false_positive').default(false),
    
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    snapshotIdx: index('finding_snapshot_idx').on(table.snapshotId),
    typeIdx: index('finding_type_idx').on(table.type),
    severityIdx: index('finding_severity_idx').on(table.severity),
    reviewOnlyIdx: index('finding_review_only_idx').on(table.reviewOnly),
  })
);

export interface EvidenceLink {
  observationId: string;
  recordSetId?: string;
  description: string;
  // Highlight specific data within the observation
  highlightedRecords?: number[]; // Indexes into answer section
}

// =============================================================================
// SUGGESTION TABLE
// =============================================================================

export const suggestions = pgTable(
  'suggestions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    findingId: uuid('finding_id')
      .notNull()
      .references(() => findings.id, { onDelete: 'cascade' }),
    
    // Suggestion details
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description').notNull(),
    action: text('action').notNull(), // Specific action to take
    
    // Risk assessment
    riskPosture: riskPostureEnum('risk_posture').notNull(),
    blastRadius: blastRadiusEnum('blast_radius').notNull(),
    reviewOnly: boolean('review_only').notNull().default(false),
    
    // Suggestion state
    appliedAt: timestamp('applied_at', { withTimezone: true }),
    appliedBy: varchar('applied_by', { length: 100 }),
    dismissedAt: timestamp('dismissed_at', { withTimezone: true }),
    dismissedBy: varchar('dismissed_by', { length: 100 }),
    dismissalReason: text('dismissal_reason'),
    
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    findingIdx: index('suggestion_finding_idx').on(table.findingId),
    reviewOnlyIdx: index('suggestion_review_only_idx').on(table.reviewOnly),
  })
);

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type Domain = typeof domains.$inferSelect;
export type NewDomain = typeof domains.$inferInsert;

export type RulesetVersion = typeof rulesetVersions.$inferSelect;
export type NewRulesetVersion = typeof rulesetVersions.$inferInsert;

export type Snapshot = typeof snapshots.$inferSelect;
export type NewSnapshot = typeof snapshots.$inferInsert;

export type VantagePoint = typeof vantagePoints.$inferSelect;
export type NewVantagePoint = typeof vantagePoints.$inferInsert;

export type Observation = typeof observations.$inferSelect;
export type NewObservation = typeof observations.$inferInsert;

export type RecordSet = typeof recordSets.$inferSelect;
export type NewRecordSet = typeof recordSets.$inferInsert;

export type Finding = typeof findings.$inferSelect;
export type NewFinding = typeof findings.$inferInsert;

export type Suggestion = typeof suggestions.$inferSelect;
export type NewSuggestion = typeof suggestions.$inferInsert;