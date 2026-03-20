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
/**
 * Selector provenance indicates how the selector was discovered
 * Per the 5-level precedence strategy:
 * 1. managed-zone-config: From zone configuration (certain)
 * 2. operator-supplied: Explicitly provided by operator (high)
 * 3. provider-heuristic: Inferred from detected provider (medium)
 * 4. common-dictionary: From common selector list (low)
 * 5. not-found: No selector discovered (heuristic)
 */
export declare const selectorProvenanceEnum: import("drizzle-orm/pg-core").PgEnum<["managed-zone-config", "operator-supplied", "provider-heuristic", "common-dictionary", "not-found"]>;
/**
 * Confidence level for selector discovery
 */
export declare const selectorConfidenceEnum: import("drizzle-orm/pg-core").PgEnum<["certain", "high", "medium", "low", "heuristic"]>;
/**
 * Known mail providers
 */
export declare const mailProviderEnum: import("drizzle-orm/pg-core").PgEnum<["google-workspace", "microsoft-365", "amazon-ses", "sendgrid", "mailgun", "mailchimp", "zoho", "fastmail", "protonmail", "custom", "unknown"]>;
/**
 * Tracks DKIM selectors discovered for each snapshot.
 * Stores provenance and confidence for audit/analysis.
 */
export declare const dkimSelectors: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "dkim_selectors";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "dkim_selectors";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        snapshotId: import("drizzle-orm/pg-core").PgColumn<{
            name: "snapshot_id";
            tableName: "dkim_selectors";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        selector: import("drizzle-orm/pg-core").PgColumn<{
            name: "selector";
            tableName: "dkim_selectors";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        domain: import("drizzle-orm/pg-core").PgColumn<{
            name: "domain";
            tableName: "dkim_selectors";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        provenance: import("drizzle-orm/pg-core").PgColumn<{
            name: "provenance";
            tableName: "dkim_selectors";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "managed-zone-config" | "operator-supplied" | "provider-heuristic" | "common-dictionary" | "not-found";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: ["managed-zone-config", "operator-supplied", "provider-heuristic", "common-dictionary", "not-found"];
            baseColumn: never;
        }, {}, {}>;
        confidence: import("drizzle-orm/pg-core").PgColumn<{
            name: "confidence";
            tableName: "dkim_selectors";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "low" | "medium" | "high" | "certain" | "heuristic";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: ["certain", "high", "medium", "low", "heuristic"];
            baseColumn: never;
        }, {}, {}>;
        provider: import("drizzle-orm/pg-core").PgColumn<{
            name: "provider";
            tableName: "dkim_selectors";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "custom" | "google-workspace" | "microsoft-365" | "amazon-ses" | "sendgrid" | "mailgun" | "mailchimp" | "zoho" | "fastmail" | "protonmail" | "unknown";
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: ["google-workspace", "microsoft-365", "amazon-ses", "sendgrid", "mailgun", "mailchimp", "zoho", "fastmail", "protonmail", "custom", "unknown"];
            baseColumn: never;
        }, {}, {}>;
        found: import("drizzle-orm/pg-core").PgColumn<{
            name: "found";
            tableName: "dkim_selectors";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        recordData: import("drizzle-orm/pg-core").PgColumn<{
            name: "record_data";
            tableName: "dkim_selectors";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        keyType: import("drizzle-orm/pg-core").PgColumn<{
            name: "key_type";
            tableName: "dkim_selectors";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        keySize: import("drizzle-orm/pg-core").PgColumn<{
            name: "key_size";
            tableName: "dkim_selectors";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        hashAlgorithms: import("drizzle-orm/pg-core").PgColumn<{
            name: "hash_algorithms";
            tableName: "dkim_selectors";
            dataType: "json";
            columnType: "PgJsonb";
            data: string[];
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        flags: import("drizzle-orm/pg-core").PgColumn<{
            name: "flags";
            tableName: "dkim_selectors";
            dataType: "json";
            columnType: "PgJsonb";
            data: string[];
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        isValid: import("drizzle-orm/pg-core").PgColumn<{
            name: "is_valid";
            tableName: "dkim_selectors";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        validationError: import("drizzle-orm/pg-core").PgColumn<{
            name: "validation_error";
            tableName: "dkim_selectors";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "dkim_selectors";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
/**
 * Aggregated mail evidence for a snapshot.
 * Provides a summary of mail-related configuration.
 */
export declare const mailEvidence: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "mail_evidence";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "mail_evidence";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        snapshotId: import("drizzle-orm/pg-core").PgColumn<{
            name: "snapshot_id";
            tableName: "mail_evidence";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        domain: import("drizzle-orm/pg-core").PgColumn<{
            name: "domain";
            tableName: "mail_evidence";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        detectedProvider: import("drizzle-orm/pg-core").PgColumn<{
            name: "detected_provider";
            tableName: "mail_evidence";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "custom" | "google-workspace" | "microsoft-365" | "amazon-ses" | "sendgrid" | "mailgun" | "mailchimp" | "zoho" | "fastmail" | "protonmail" | "unknown";
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: ["google-workspace", "microsoft-365", "amazon-ses", "sendgrid", "mailgun", "mailchimp", "zoho", "fastmail", "protonmail", "custom", "unknown"];
            baseColumn: never;
        }, {}, {}>;
        providerConfidence: import("drizzle-orm/pg-core").PgColumn<{
            name: "provider_confidence";
            tableName: "mail_evidence";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "low" | "medium" | "high" | "certain" | "heuristic";
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: ["certain", "high", "medium", "low", "heuristic"];
            baseColumn: never;
        }, {}, {}>;
        hasMx: import("drizzle-orm/pg-core").PgColumn<{
            name: "has_mx";
            tableName: "mail_evidence";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        isNullMx: import("drizzle-orm/pg-core").PgColumn<{
            name: "is_null_mx";
            tableName: "mail_evidence";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        mxHosts: import("drizzle-orm/pg-core").PgColumn<{
            name: "mx_hosts";
            tableName: "mail_evidence";
            dataType: "json";
            columnType: "PgJsonb";
            data: string[];
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        hasSpf: import("drizzle-orm/pg-core").PgColumn<{
            name: "has_spf";
            tableName: "mail_evidence";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        spfRecord: import("drizzle-orm/pg-core").PgColumn<{
            name: "spf_record";
            tableName: "mail_evidence";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        spfMechanisms: import("drizzle-orm/pg-core").PgColumn<{
            name: "spf_mechanisms";
            tableName: "mail_evidence";
            dataType: "json";
            columnType: "PgJsonb";
            data: string[];
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        hasDmarc: import("drizzle-orm/pg-core").PgColumn<{
            name: "has_dmarc";
            tableName: "mail_evidence";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        dmarcRecord: import("drizzle-orm/pg-core").PgColumn<{
            name: "dmarc_record";
            tableName: "mail_evidence";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        dmarcPolicy: import("drizzle-orm/pg-core").PgColumn<{
            name: "dmarc_policy";
            tableName: "mail_evidence";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        dmarcSubdomainPolicy: import("drizzle-orm/pg-core").PgColumn<{
            name: "dmarc_subdomain_policy";
            tableName: "mail_evidence";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        dmarcPercent: import("drizzle-orm/pg-core").PgColumn<{
            name: "dmarc_percent";
            tableName: "mail_evidence";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        dmarcRua: import("drizzle-orm/pg-core").PgColumn<{
            name: "dmarc_rua";
            tableName: "mail_evidence";
            dataType: "json";
            columnType: "PgJsonb";
            data: string[];
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        dmarcRuf: import("drizzle-orm/pg-core").PgColumn<{
            name: "dmarc_ruf";
            tableName: "mail_evidence";
            dataType: "json";
            columnType: "PgJsonb";
            data: string[];
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        hasDkim: import("drizzle-orm/pg-core").PgColumn<{
            name: "has_dkim";
            tableName: "mail_evidence";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        dkimSelectorsFound: import("drizzle-orm/pg-core").PgColumn<{
            name: "dkim_selectors_found";
            tableName: "mail_evidence";
            dataType: "json";
            columnType: "PgJsonb";
            data: string[];
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        dkimSelectorCount: import("drizzle-orm/pg-core").PgColumn<{
            name: "dkim_selector_count";
            tableName: "mail_evidence";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        hasMtaSts: import("drizzle-orm/pg-core").PgColumn<{
            name: "has_mta_sts";
            tableName: "mail_evidence";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        mtaStsMode: import("drizzle-orm/pg-core").PgColumn<{
            name: "mta_sts_mode";
            tableName: "mail_evidence";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        mtaStsVersion: import("drizzle-orm/pg-core").PgColumn<{
            name: "mta_sts_version";
            tableName: "mail_evidence";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        mtaStsMaxAge: import("drizzle-orm/pg-core").PgColumn<{
            name: "mta_sts_max_age";
            tableName: "mail_evidence";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        hasTlsRpt: import("drizzle-orm/pg-core").PgColumn<{
            name: "has_tls_rpt";
            tableName: "mail_evidence";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        tlsRptRua: import("drizzle-orm/pg-core").PgColumn<{
            name: "tls_rpt_rua";
            tableName: "mail_evidence";
            dataType: "json";
            columnType: "PgJsonb";
            data: string[];
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        hasBimi: import("drizzle-orm/pg-core").PgColumn<{
            name: "has_bimi";
            tableName: "mail_evidence";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        bimiVersion: import("drizzle-orm/pg-core").PgColumn<{
            name: "bimi_version";
            tableName: "mail_evidence";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        bimiLocation: import("drizzle-orm/pg-core").PgColumn<{
            name: "bimi_location";
            tableName: "mail_evidence";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        bimiAuthority: import("drizzle-orm/pg-core").PgColumn<{
            name: "bimi_authority";
            tableName: "mail_evidence";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        securityScore: import("drizzle-orm/pg-core").PgColumn<{
            name: "security_score";
            tableName: "mail_evidence";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        scoreBreakdown: import("drizzle-orm/pg-core").PgColumn<{
            name: "score_breakdown";
            tableName: "mail_evidence";
            dataType: "json";
            columnType: "PgJsonb";
            data: {
                mx: number;
                spf: number;
                dmarc: number;
                dkim: number;
                mtaSts: number;
                tlsRpt: number;
                bimi: number;
            };
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "mail_evidence";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export type DkimSelector = typeof dkimSelectors.$inferSelect;
export type NewDkimSelector = typeof dkimSelectors.$inferInsert;
export type MailEvidence = typeof mailEvidence.$inferSelect;
export type NewMailEvidence = typeof mailEvidence.$inferInsert;
//# sourceMappingURL=mail.d.ts.map