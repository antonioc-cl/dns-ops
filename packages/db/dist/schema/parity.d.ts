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
/**
 * Shadow comparison overall status
 */
export declare const shadowStatusEnum: import("drizzle-orm/pg-core").PgEnum<["match", "mismatch", "partial-match", "error"]>;
/**
 * Field comparison status
 */
export declare const fieldComparisonStatusEnum: import("drizzle-orm/pg-core").PgEnum<["match", "mismatch", "missing-in-legacy", "missing-in-new", "not-comparable"]>;
/**
 * Adjudication decision for mismatches
 */
export declare const adjudicationEnum: import("drizzle-orm/pg-core").PgEnum<["new-correct", "legacy-correct", "both-wrong", "acceptable-difference"]>;
/**
 * Legacy tool type
 */
export declare const legacyToolTypeEnum: import("drizzle-orm/pg-core").PgEnum<["dmarc-check", "dkim-check", "spf-check", "mx-check", "dns-check"]>;
/**
 * Provider baseline status
 */
export declare const baselineStatusEnum: import("drizzle-orm/pg-core").PgEnum<["active", "deprecated", "draft"]>;
/**
 * Durable storage for shadow comparisons between legacy tools and new system.
 * Each comparison compares a snapshot's findings against legacy tool output.
 */
export declare const shadowComparisons: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "shadow_comparisons";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "shadow_comparisons";
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
            tableName: "shadow_comparisons";
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
            tableName: "shadow_comparisons";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        comparedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "compared_at";
            tableName: "shadow_comparisons";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        status: import("drizzle-orm/pg-core").PgColumn<{
            name: "status";
            tableName: "shadow_comparisons";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "match" | "mismatch" | "partial-match" | "error";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: ["match", "mismatch", "partial-match", "error"];
            baseColumn: never;
        }, {}, {}>;
        comparisons: import("drizzle-orm/pg-core").PgColumn<{
            name: "comparisons";
            tableName: "shadow_comparisons";
            dataType: "json";
            columnType: "PgJsonb";
            data: FieldComparison[];
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        metrics: import("drizzle-orm/pg-core").PgColumn<{
            name: "metrics";
            tableName: "shadow_comparisons";
            dataType: "json";
            columnType: "PgJsonb";
            data: {
                totalFields: number;
                matchingFields: number;
                mismatchingFields: number;
                missingInNew: number;
                missingInLegacy: number;
            };
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        summary: import("drizzle-orm/pg-core").PgColumn<{
            name: "summary";
            tableName: "shadow_comparisons";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        legacyOutput: import("drizzle-orm/pg-core").PgColumn<{
            name: "legacy_output";
            tableName: "shadow_comparisons";
            dataType: "json";
            columnType: "PgJsonb";
            data: LegacyToolOutput;
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        acknowledgedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "acknowledged_at";
            tableName: "shadow_comparisons";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        acknowledgedBy: import("drizzle-orm/pg-core").PgColumn<{
            name: "acknowledged_by";
            tableName: "shadow_comparisons";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        adjudication: import("drizzle-orm/pg-core").PgColumn<{
            name: "adjudication";
            tableName: "shadow_comparisons";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "new-correct" | "legacy-correct" | "both-wrong" | "acceptable-difference";
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: ["new-correct", "legacy-correct", "both-wrong", "acceptable-difference"];
            baseColumn: never;
        }, {}, {}>;
        adjudicationNotes: import("drizzle-orm/pg-core").PgColumn<{
            name: "adjudication_notes";
            tableName: "shadow_comparisons";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        tenantId: import("drizzle-orm/pg-core").PgColumn<{
            name: "tenant_id";
            tableName: "shadow_comparisons";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "shadow_comparisons";
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
 * Durable audit log for legacy tool access.
 * Tracks when and how legacy tools are accessed for parity monitoring.
 */
export declare const legacyAccessLogs: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "legacy_access_logs";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "legacy_access_logs";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        toolType: import("drizzle-orm/pg-core").PgColumn<{
            name: "tool_type";
            tableName: "legacy_access_logs";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "dmarc-check" | "dkim-check" | "spf-check" | "mx-check" | "dns-check";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: ["dmarc-check", "dkim-check", "spf-check", "mx-check", "dns-check"];
            baseColumn: never;
        }, {}, {}>;
        toolEndpoint: import("drizzle-orm/pg-core").PgColumn<{
            name: "tool_endpoint";
            tableName: "legacy_access_logs";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        domain: import("drizzle-orm/pg-core").PgColumn<{
            name: "domain";
            tableName: "legacy_access_logs";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        requestedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "requested_at";
            tableName: "legacy_access_logs";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        requestedBy: import("drizzle-orm/pg-core").PgColumn<{
            name: "requested_by";
            tableName: "legacy_access_logs";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        requestSource: import("drizzle-orm/pg-core").PgColumn<{
            name: "request_source";
            tableName: "legacy_access_logs";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        responseStatus: import("drizzle-orm/pg-core").PgColumn<{
            name: "response_status";
            tableName: "legacy_access_logs";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        responseTimeMs: import("drizzle-orm/pg-core").PgColumn<{
            name: "response_time_ms";
            tableName: "legacy_access_logs";
            dataType: "json";
            columnType: "PgJsonb";
            data: number;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        outputSummary: import("drizzle-orm/pg-core").PgColumn<{
            name: "output_summary";
            tableName: "legacy_access_logs";
            dataType: "json";
            columnType: "PgJsonb";
            data: {
                dmarcPresent?: boolean;
                dmarcValid?: boolean;
                spfPresent?: boolean;
                spfValid?: boolean;
                dkimPresent?: boolean;
                dkimValid?: boolean;
            };
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        rawOutput: import("drizzle-orm/pg-core").PgColumn<{
            name: "raw_output";
            tableName: "legacy_access_logs";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        snapshotId: import("drizzle-orm/pg-core").PgColumn<{
            name: "snapshot_id";
            tableName: "legacy_access_logs";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        tenantId: import("drizzle-orm/pg-core").PgColumn<{
            name: "tenant_id";
            tableName: "legacy_access_logs";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "legacy_access_logs";
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
 * Read-only provider template baselines.
 * Reference data for expected mail configuration by provider.
 * These are NOT tenant-editable - they're maintained as system reference data.
 */
export declare const providerBaselines: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "provider_baselines";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "provider_baselines";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        providerKey: import("drizzle-orm/pg-core").PgColumn<{
            name: "provider_key";
            tableName: "provider_baselines";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        providerName: import("drizzle-orm/pg-core").PgColumn<{
            name: "provider_name";
            tableName: "provider_baselines";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        status: import("drizzle-orm/pg-core").PgColumn<{
            name: "status";
            tableName: "provider_baselines";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "active" | "deprecated" | "draft";
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: ["active", "deprecated", "draft"];
            baseColumn: never;
        }, {}, {}>;
        baseline: import("drizzle-orm/pg-core").PgColumn<{
            name: "baseline";
            tableName: "provider_baselines";
            dataType: "json";
            columnType: "PgJsonb";
            data: ProviderBaselineData;
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        dkimSelectors: import("drizzle-orm/pg-core").PgColumn<{
            name: "dkim_selectors";
            tableName: "provider_baselines";
            dataType: "json";
            columnType: "PgJsonb";
            data: string[];
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        mxPatterns: import("drizzle-orm/pg-core").PgColumn<{
            name: "mx_patterns";
            tableName: "provider_baselines";
            dataType: "json";
            columnType: "PgJsonb";
            data: string[];
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        spfIncludes: import("drizzle-orm/pg-core").PgColumn<{
            name: "spf_includes";
            tableName: "provider_baselines";
            dataType: "json";
            columnType: "PgJsonb";
            data: string[];
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        notes: import("drizzle-orm/pg-core").PgColumn<{
            name: "notes";
            tableName: "provider_baselines";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        documentationUrl: import("drizzle-orm/pg-core").PgColumn<{
            name: "documentation_url";
            tableName: "provider_baselines";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        version: import("drizzle-orm/pg-core").PgColumn<{
            name: "version";
            tableName: "provider_baselines";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "provider_baselines";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        updatedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "updated_at";
            tableName: "provider_baselines";
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
 * Aggregated mismatch reports for cutover decisions.
 * Summarizes mismatches over time for a domain or tenant.
 */
export declare const mismatchReports: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "mismatch_reports";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "mismatch_reports";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        domain: import("drizzle-orm/pg-core").PgColumn<{
            name: "domain";
            tableName: "mismatch_reports";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        tenantId: import("drizzle-orm/pg-core").PgColumn<{
            name: "tenant_id";
            tableName: "mismatch_reports";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        periodStart: import("drizzle-orm/pg-core").PgColumn<{
            name: "period_start";
            tableName: "mismatch_reports";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        periodEnd: import("drizzle-orm/pg-core").PgColumn<{
            name: "period_end";
            tableName: "mismatch_reports";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        totalComparisons: import("drizzle-orm/pg-core").PgColumn<{
            name: "total_comparisons";
            tableName: "mismatch_reports";
            dataType: "json";
            columnType: "PgJsonb";
            data: number;
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        matchCount: import("drizzle-orm/pg-core").PgColumn<{
            name: "match_count";
            tableName: "mismatch_reports";
            dataType: "json";
            columnType: "PgJsonb";
            data: number;
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        mismatchCount: import("drizzle-orm/pg-core").PgColumn<{
            name: "mismatch_count";
            tableName: "mismatch_reports";
            dataType: "json";
            columnType: "PgJsonb";
            data: number;
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        partialMatchCount: import("drizzle-orm/pg-core").PgColumn<{
            name: "partial_match_count";
            tableName: "mismatch_reports";
            dataType: "json";
            columnType: "PgJsonb";
            data: number;
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        mismatchBreakdown: import("drizzle-orm/pg-core").PgColumn<{
            name: "mismatch_breakdown";
            tableName: "mismatch_reports";
            dataType: "json";
            columnType: "PgJsonb";
            data: {
                dmarcPresent: number;
                dmarcValid: number;
                dmarcPolicy: number;
                spfPresent: number;
                spfValid: number;
                dkimPresent: number;
                dkimValid: number;
            };
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        adjudicatedCount: import("drizzle-orm/pg-core").PgColumn<{
            name: "adjudicated_count";
            tableName: "mismatch_reports";
            dataType: "json";
            columnType: "PgJsonb";
            data: number;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        pendingCount: import("drizzle-orm/pg-core").PgColumn<{
            name: "pending_count";
            tableName: "mismatch_reports";
            dataType: "json";
            columnType: "PgJsonb";
            data: number;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        matchRate: import("drizzle-orm/pg-core").PgColumn<{
            name: "match_rate";
            tableName: "mismatch_reports";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        cutoverReady: import("drizzle-orm/pg-core").PgColumn<{
            name: "cutover_ready";
            tableName: "mismatch_reports";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        cutoverNotes: import("drizzle-orm/pg-core").PgColumn<{
            name: "cutover_notes";
            tableName: "mismatch_reports";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        generatedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "generated_at";
            tableName: "mismatch_reports";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        generatedBy: import("drizzle-orm/pg-core").PgColumn<{
            name: "generated_by";
            tableName: "mismatch_reports";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export interface FieldComparison {
    field: 'dmarc-present' | 'dmarc-valid' | 'dmarc-policy' | 'spf-present' | 'spf-valid' | 'dkim-present' | 'dkim-valid' | 'dkim-selector';
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
    dmarc?: {
        expectedPolicy?: 'none' | 'quarantine' | 'reject';
        requiresRua?: boolean;
        commonRecordPattern?: string;
    };
    spf?: {
        requiredIncludes?: string[];
        optionalIncludes?: string[];
        commonMechanisms?: string[];
    };
    dkim?: {
        requiredSelectors?: string[];
        optionalSelectors?: string[];
        keySize?: number;
        keyType?: 'rsa' | 'ed25519';
    };
    mx?: {
        expectedHosts?: string[];
        hostPatterns?: string[];
        priority?: number;
    };
}
export type ShadowComparison = typeof shadowComparisons.$inferSelect;
export type NewShadowComparison = typeof shadowComparisons.$inferInsert;
export type LegacyAccessLog = typeof legacyAccessLogs.$inferSelect;
export type NewLegacyAccessLog = typeof legacyAccessLogs.$inferInsert;
export type ProviderBaseline = typeof providerBaselines.$inferSelect;
export type NewProviderBaseline = typeof providerBaselines.$inferInsert;
export type MismatchReport = typeof mismatchReports.$inferSelect;
export type NewMismatchReport = typeof mismatchReports.$inferInsert;
//# sourceMappingURL=parity.d.ts.map