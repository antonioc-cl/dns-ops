/**
 * Mail Evidence Schema
 *
 * Persistence layer for mail-specific evidence:
 * - DKIM selectors: Discovered selectors with provenance tracking
 * - Mail provider detection: Attributed providers for domains
 * - MTA-STS/TLS-RPT: Enhanced mail transport security records
 *
 * This schema extends the base DNS evidence model to support
 * mail-specific metadata and provenance tracking.
 */
import { boolean, index, jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar, } from 'drizzle-orm/pg-core';
import { snapshots } from './index.js';
// =============================================================================
// ENUMS
// =============================================================================
/**
 * Selector provenance indicates how the selector was discovered
 * Per the 5-level precedence strategy:
 * 1. managed-zone-config: From zone configuration (certain)
 * 2. operator-supplied: Explicitly provided by operator (high)
 * 3. provider-heuristic: Inferred from detected provider (medium)
 * 4. common-dictionary: From common selector list (low)
 * 5. not-found: No selector discovered (heuristic)
 */
export const selectorProvenanceEnum = pgEnum('selector_provenance', [
    'managed-zone-config',
    'operator-supplied',
    'provider-heuristic',
    'common-dictionary',
    'not-found',
]);
/**
 * Confidence level for selector discovery
 */
export const selectorConfidenceEnum = pgEnum('selector_confidence', [
    'certain',
    'high',
    'medium',
    'low',
    'heuristic',
]);
/**
 * Known mail providers
 */
export const mailProviderEnum = pgEnum('mail_provider', [
    'google-workspace',
    'microsoft-365',
    'amazon-ses',
    'sendgrid',
    'mailgun',
    'mailchimp',
    'zoho',
    'fastmail',
    'protonmail',
    'custom',
    'unknown',
]);
// =============================================================================
// DKIM SELECTORS TABLE
// =============================================================================
/**
 * Tracks DKIM selectors discovered for each snapshot.
 * Stores provenance and confidence for audit/analysis.
 */
export const dkimSelectors = pgTable('dkim_selectors', {
    id: uuid('id').primaryKey().defaultRandom(),
    snapshotId: uuid('snapshot_id')
        .notNull()
        .references(() => snapshots.id, { onDelete: 'cascade' }),
    // Selector details
    selector: varchar('selector', { length: 63 }).notNull(),
    domain: varchar('domain', { length: 253 }).notNull(),
    // Discovery metadata
    provenance: selectorProvenanceEnum('provenance').notNull(),
    confidence: selectorConfidenceEnum('confidence').notNull(),
    // Provider attribution
    provider: mailProviderEnum('provider'),
    // DNS query result
    found: boolean('found').notNull(), // Was the DKIM record found?
    recordData: text('record_data'), // Raw TXT record if found
    // DKIM record details (parsed)
    keyType: varchar('key_type', { length: 10 }), // rsa, ed25519
    keySize: varchar('key_size', { length: 10 }), // 1024, 2048, etc.
    hashAlgorithms: jsonb('hash_algorithms').$type(), // sha256, sha1
    flags: jsonb('flags').$type(), // t=s, t=y, etc.
    // Validation status
    isValid: boolean('is_valid'),
    validationError: text('validation_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    snapshotIdx: index('dkim_selector_snapshot_idx').on(table.snapshotId),
    selectorIdx: index('dkim_selector_selector_idx').on(table.selector),
    domainIdx: index('dkim_selector_domain_idx').on(table.domain),
    providerIdx: index('dkim_selector_provider_idx').on(table.provider),
    provenanceIdx: index('dkim_selector_provenance_idx').on(table.provenance),
}));
// =============================================================================
// MAIL EVIDENCE TABLE
// =============================================================================
/**
 * Aggregated mail evidence for a snapshot.
 * Provides a summary of mail-related configuration.
 */
export const mailEvidence = pgTable('mail_evidence', {
    id: uuid('id').primaryKey().defaultRandom(),
    snapshotId: uuid('snapshot_id')
        .notNull()
        .references(() => snapshots.id, { onDelete: 'cascade' }),
    domain: varchar('domain', { length: 253 }).notNull(),
    // Provider detection
    detectedProvider: mailProviderEnum('detected_provider'),
    providerConfidence: selectorConfidenceEnum('provider_confidence'),
    // MX status
    hasMx: boolean('has_mx').notNull().default(false),
    isNullMx: boolean('is_null_mx').notNull().default(false),
    mxHosts: jsonb('mx_hosts').$type(),
    // SPF status
    hasSpf: boolean('has_spf').notNull().default(false),
    spfRecord: text('spf_record'),
    spfMechanisms: jsonb('spf_mechanisms').$type(),
    // DMARC status
    hasDmarc: boolean('has_dmarc').notNull().default(false),
    dmarcRecord: text('dmarc_record'),
    dmarcPolicy: varchar('dmarc_policy', { length: 20 }), // none, quarantine, reject
    dmarcSubdomainPolicy: varchar('dmarc_subdomain_policy', { length: 20 }),
    dmarcPercent: varchar('dmarc_percent', { length: 5 }),
    dmarcRua: jsonb('dmarc_rua').$type(), // Aggregate report URIs
    dmarcRuf: jsonb('dmarc_ruf').$type(), // Forensic report URIs
    // DKIM summary
    hasDkim: boolean('has_dkim').notNull().default(false),
    dkimSelectorsFound: jsonb('dkim_selectors_found').$type(),
    dkimSelectorCount: varchar('dkim_selector_count', { length: 5 }),
    // MTA-STS status
    hasMtaSts: boolean('has_mta_sts').notNull().default(false),
    mtaStsMode: varchar('mta_sts_mode', { length: 20 }), // enforce, testing, none
    mtaStsVersion: varchar('mta_sts_version', { length: 10 }),
    mtaStsMaxAge: varchar('mta_sts_max_age', { length: 15 }),
    // TLS-RPT status
    hasTlsRpt: boolean('has_tls_rpt').notNull().default(false),
    tlsRptRua: jsonb('tls_rpt_rua').$type(),
    // BIMI status
    hasBimi: boolean('has_bimi').notNull().default(false),
    bimiVersion: varchar('bimi_version', { length: 10 }),
    bimiLocation: text('bimi_location'),
    bimiAuthority: text('bimi_authority'),
    // Overall mail security score (0-100)
    securityScore: varchar('security_score', { length: 5 }),
    scoreBreakdown: jsonb('score_breakdown').$type(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    snapshotIdx: index('mail_evidence_snapshot_idx').on(table.snapshotId),
    domainIdx: index('mail_evidence_domain_idx').on(table.domain),
    providerIdx: index('mail_evidence_provider_idx').on(table.detectedProvider),
    scoreIdx: index('mail_evidence_score_idx').on(table.securityScore),
}));
//# sourceMappingURL=mail.js.map