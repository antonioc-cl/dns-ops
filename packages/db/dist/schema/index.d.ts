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
export declare const resultStateEnum: import("drizzle-orm/pg-core").PgEnum<["complete", "partial", "failed"]>;
export declare const severityEnum: import("drizzle-orm/pg-core").PgEnum<["critical", "high", "medium", "low", "info"]>;
export declare const confidenceEnum: import("drizzle-orm/pg-core").PgEnum<["certain", "high", "medium", "low", "heuristic"]>;
export declare const riskPostureEnum: import("drizzle-orm/pg-core").PgEnum<["safe", "low", "medium", "high", "critical"]>;
export declare const blastRadiusEnum: import("drizzle-orm/pg-core").PgEnum<["none", "single-domain", "subdomain-tree", "related-domains", "infrastructure", "organization-wide"]>;
export declare const zoneManagementEnum: import("drizzle-orm/pg-core").PgEnum<["managed", "unmanaged", "unknown"]>;
export declare const vantageTypeEnum: import("drizzle-orm/pg-core").PgEnum<["public-recursive", "authoritative", "parent-zone", "probe"]>;
export declare const collectionStatusEnum: import("drizzle-orm/pg-core").PgEnum<["success", "timeout", "refused", "truncated", "nxdomain", "nodata", "error"]>;
export declare const domains: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "domains";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "domains";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        name: import("drizzle-orm/pg-core").PgColumn<{
            name: "name";
            tableName: "domains";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        normalizedName: import("drizzle-orm/pg-core").PgColumn<{
            name: "normalized_name";
            tableName: "domains";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        punycodeName: import("drizzle-orm/pg-core").PgColumn<{
            name: "punycode_name";
            tableName: "domains";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        zoneManagement: import("drizzle-orm/pg-core").PgColumn<{
            name: "zone_management";
            tableName: "domains";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "unknown" | "managed" | "unmanaged";
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: ["managed", "unmanaged", "unknown"];
            baseColumn: never;
        }, {}, {}>;
        tenantId: import("drizzle-orm/pg-core").PgColumn<{
            name: "tenant_id";
            tableName: "domains";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        metadata: import("drizzle-orm/pg-core").PgColumn<{
            name: "metadata";
            tableName: "domains";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "domains";
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
            tableName: "domains";
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
export declare const rulesetVersions: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "ruleset_versions";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "ruleset_versions";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        version: import("drizzle-orm/pg-core").PgColumn<{
            name: "version";
            tableName: "ruleset_versions";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        name: import("drizzle-orm/pg-core").PgColumn<{
            name: "name";
            tableName: "ruleset_versions";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        description: import("drizzle-orm/pg-core").PgColumn<{
            name: "description";
            tableName: "ruleset_versions";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        rules: import("drizzle-orm/pg-core").PgColumn<{
            name: "rules";
            tableName: "ruleset_versions";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        active: import("drizzle-orm/pg-core").PgColumn<{
            name: "active";
            tableName: "ruleset_versions";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "ruleset_versions";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdBy: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_by";
            tableName: "ruleset_versions";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export declare const snapshots: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "snapshots";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "snapshots";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        domainId: import("drizzle-orm/pg-core").PgColumn<{
            name: "domain_id";
            tableName: "snapshots";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        domainName: import("drizzle-orm/pg-core").PgColumn<{
            name: "domain_name";
            tableName: "snapshots";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        resultState: import("drizzle-orm/pg-core").PgColumn<{
            name: "result_state";
            tableName: "snapshots";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "complete" | "partial" | "failed";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: ["complete", "partial", "failed"];
            baseColumn: never;
        }, {}, {}>;
        queriedNames: import("drizzle-orm/pg-core").PgColumn<{
            name: "queried_names";
            tableName: "snapshots";
            dataType: "json";
            columnType: "PgJsonb";
            data: string[];
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        queriedTypes: import("drizzle-orm/pg-core").PgColumn<{
            name: "queried_types";
            tableName: "snapshots";
            dataType: "json";
            columnType: "PgJsonb";
            data: string[];
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        vantages: import("drizzle-orm/pg-core").PgColumn<{
            name: "vantages";
            tableName: "snapshots";
            dataType: "json";
            columnType: "PgJsonb";
            data: string[];
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        zoneManagement: import("drizzle-orm/pg-core").PgColumn<{
            name: "zone_management";
            tableName: "snapshots";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "unknown" | "managed" | "unmanaged";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: ["managed", "unmanaged", "unknown"];
            baseColumn: never;
        }, {}, {}>;
        rulesetVersionId: import("drizzle-orm/pg-core").PgColumn<{
            name: "ruleset_version_id";
            tableName: "snapshots";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        triggeredBy: import("drizzle-orm/pg-core").PgColumn<{
            name: "triggered_by";
            tableName: "snapshots";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        collectionDurationMs: import("drizzle-orm/pg-core").PgColumn<{
            name: "collection_duration_ms";
            tableName: "snapshots";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        errorMessage: import("drizzle-orm/pg-core").PgColumn<{
            name: "error_message";
            tableName: "snapshots";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        metadata: import("drizzle-orm/pg-core").PgColumn<{
            name: "metadata";
            tableName: "snapshots";
            dataType: "json";
            columnType: "PgJsonb";
            data: {
                vantageIdentifiers?: string[];
                hasDelegationData?: boolean;
                parentZone?: string;
                nsServers?: string[];
                hasDivergence?: boolean;
                divergenceDetails?: Array<{
                    queryName: string;
                    queryType: string;
                    groups: Array<{
                        servers: string[];
                        signature: string;
                    }>;
                    totalServers: number;
                }>;
                lameDelegations?: Array<{
                    server: string;
                    reason: "not-authoritative" | "timeout" | "refused" | "error";
                }>;
                missingGlue?: string[];
                hasDnssec?: boolean;
                dnssec?: {
                    adFlagSet?: boolean;
                    hasDnskey?: boolean;
                    hasDs?: boolean;
                };
            };
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "snapshots";
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
export declare const vantagePoints: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "vantage_points";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "vantage_points";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        name: import("drizzle-orm/pg-core").PgColumn<{
            name: "name";
            tableName: "vantage_points";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        type: import("drizzle-orm/pg-core").PgColumn<{
            name: "type";
            tableName: "vantage_points";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "public-recursive" | "authoritative" | "parent-zone" | "probe";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: ["public-recursive", "authoritative", "parent-zone", "probe"];
            baseColumn: never;
        }, {}, {}>;
        description: import("drizzle-orm/pg-core").PgColumn<{
            name: "description";
            tableName: "vantage_points";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        config: import("drizzle-orm/pg-core").PgColumn<{
            name: "config";
            tableName: "vantage_points";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        endpoints: import("drizzle-orm/pg-core").PgColumn<{
            name: "endpoints";
            tableName: "vantage_points";
            dataType: "json";
            columnType: "PgJsonb";
            data: string[];
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        region: import("drizzle-orm/pg-core").PgColumn<{
            name: "region";
            tableName: "vantage_points";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        network: import("drizzle-orm/pg-core").PgColumn<{
            name: "network";
            tableName: "vantage_points";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        isActive: import("drizzle-orm/pg-core").PgColumn<{
            name: "is_active";
            tableName: "vantage_points";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "vantage_points";
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
            tableName: "vantage_points";
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
export declare const observations: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "observations";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "observations";
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
            tableName: "observations";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        queryName: import("drizzle-orm/pg-core").PgColumn<{
            name: "query_name";
            tableName: "observations";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        queryType: import("drizzle-orm/pg-core").PgColumn<{
            name: "query_type";
            tableName: "observations";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        vantageId: import("drizzle-orm/pg-core").PgColumn<{
            name: "vantage_id";
            tableName: "observations";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        vantageType: import("drizzle-orm/pg-core").PgColumn<{
            name: "vantage_type";
            tableName: "observations";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "public-recursive" | "authoritative" | "parent-zone" | "probe";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: ["public-recursive", "authoritative", "parent-zone", "probe"];
            baseColumn: never;
        }, {}, {}>;
        vantageIdentifier: import("drizzle-orm/pg-core").PgColumn<{
            name: "vantage_identifier";
            tableName: "observations";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        status: import("drizzle-orm/pg-core").PgColumn<{
            name: "status";
            tableName: "observations";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "timeout" | "refused" | "error" | "success" | "truncated" | "nxdomain" | "nodata";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: ["success", "timeout", "refused", "truncated", "nxdomain", "nodata", "error"];
            baseColumn: never;
        }, {}, {}>;
        queriedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "queried_at";
            tableName: "observations";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        responseTimeMs: import("drizzle-orm/pg-core").PgColumn<{
            name: "response_time_ms";
            tableName: "observations";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        responseCode: import("drizzle-orm/pg-core").PgColumn<{
            name: "response_code";
            tableName: "observations";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        flags: import("drizzle-orm/pg-core").PgColumn<{
            name: "flags";
            tableName: "observations";
            dataType: "json";
            columnType: "PgJsonb";
            data: Record<string, boolean>;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        answerSection: import("drizzle-orm/pg-core").PgColumn<{
            name: "answer_section";
            tableName: "observations";
            dataType: "json";
            columnType: "PgJsonb";
            data: DNSRecord[];
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        authoritySection: import("drizzle-orm/pg-core").PgColumn<{
            name: "authority_section";
            tableName: "observations";
            dataType: "json";
            columnType: "PgJsonb";
            data: DNSRecord[];
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        additionalSection: import("drizzle-orm/pg-core").PgColumn<{
            name: "additional_section";
            tableName: "observations";
            dataType: "json";
            columnType: "PgJsonb";
            data: DNSRecord[];
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        errorMessage: import("drizzle-orm/pg-core").PgColumn<{
            name: "error_message";
            tableName: "observations";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        errorDetails: import("drizzle-orm/pg-core").PgColumn<{
            name: "error_details";
            tableName: "observations";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        rawResponse: import("drizzle-orm/pg-core").PgColumn<{
            name: "raw_response";
            tableName: "observations";
            dataType: "string";
            columnType: "PgText";
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
export interface DNSRecord {
    name: string;
    type: string;
    ttl: number;
    data: string;
    priority?: number;
    mname?: string;
    rname?: string;
    serial?: number;
    refresh?: number;
    retry?: number;
    expire?: number;
    minimum?: number;
}
export declare const recordSets: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "record_sets";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "record_sets";
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
            tableName: "record_sets";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        name: import("drizzle-orm/pg-core").PgColumn<{
            name: "name";
            tableName: "record_sets";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        type: import("drizzle-orm/pg-core").PgColumn<{
            name: "type";
            tableName: "record_sets";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        ttl: import("drizzle-orm/pg-core").PgColumn<{
            name: "ttl";
            tableName: "record_sets";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        values: import("drizzle-orm/pg-core").PgColumn<{
            name: "values";
            tableName: "record_sets";
            dataType: "json";
            columnType: "PgJsonb";
            data: string[];
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        sourceObservationIds: import("drizzle-orm/pg-core").PgColumn<{
            name: "source_observation_ids";
            tableName: "record_sets";
            dataType: "json";
            columnType: "PgJsonb";
            data: string[];
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        sourceVantages: import("drizzle-orm/pg-core").PgColumn<{
            name: "source_vantages";
            tableName: "record_sets";
            dataType: "json";
            columnType: "PgJsonb";
            data: string[];
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        isConsistent: import("drizzle-orm/pg-core").PgColumn<{
            name: "is_consistent";
            tableName: "record_sets";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        consolidationNotes: import("drizzle-orm/pg-core").PgColumn<{
            name: "consolidation_notes";
            tableName: "record_sets";
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
            tableName: "record_sets";
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
export declare const findings: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "findings";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "findings";
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
            tableName: "findings";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        type: import("drizzle-orm/pg-core").PgColumn<{
            name: "type";
            tableName: "findings";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        title: import("drizzle-orm/pg-core").PgColumn<{
            name: "title";
            tableName: "findings";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        description: import("drizzle-orm/pg-core").PgColumn<{
            name: "description";
            tableName: "findings";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        severity: import("drizzle-orm/pg-core").PgColumn<{
            name: "severity";
            tableName: "findings";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "low" | "medium" | "high" | "critical" | "info";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: ["critical", "high", "medium", "low", "info"];
            baseColumn: never;
        }, {}, {}>;
        confidence: import("drizzle-orm/pg-core").PgColumn<{
            name: "confidence";
            tableName: "findings";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "low" | "medium" | "high" | "certain" | "heuristic";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: ["certain", "high", "medium", "low", "heuristic"];
            baseColumn: never;
        }, {}, {}>;
        riskPosture: import("drizzle-orm/pg-core").PgColumn<{
            name: "risk_posture";
            tableName: "findings";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "low" | "medium" | "high" | "critical" | "safe";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: ["safe", "low", "medium", "high", "critical"];
            baseColumn: never;
        }, {}, {}>;
        blastRadius: import("drizzle-orm/pg-core").PgColumn<{
            name: "blast_radius";
            tableName: "findings";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "none" | "single-domain" | "subdomain-tree" | "related-domains" | "infrastructure" | "organization-wide";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: ["none", "single-domain", "subdomain-tree", "related-domains", "infrastructure", "organization-wide"];
            baseColumn: never;
        }, {}, {}>;
        reviewOnly: import("drizzle-orm/pg-core").PgColumn<{
            name: "review_only";
            tableName: "findings";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        evidence: import("drizzle-orm/pg-core").PgColumn<{
            name: "evidence";
            tableName: "findings";
            dataType: "json";
            columnType: "PgJsonb";
            data: EvidenceLink[];
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        ruleId: import("drizzle-orm/pg-core").PgColumn<{
            name: "rule_id";
            tableName: "findings";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        ruleVersion: import("drizzle-orm/pg-core").PgColumn<{
            name: "rule_version";
            tableName: "findings";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        acknowledgedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "acknowledged_at";
            tableName: "findings";
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
            tableName: "findings";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        falsePositive: import("drizzle-orm/pg-core").PgColumn<{
            name: "false_positive";
            tableName: "findings";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: false;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "findings";
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
export interface EvidenceLink {
    observationId: string;
    recordSetId?: string;
    description: string;
    highlightedRecords?: number[];
}
export declare const suggestions: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "suggestions";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "suggestions";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        findingId: import("drizzle-orm/pg-core").PgColumn<{
            name: "finding_id";
            tableName: "suggestions";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        title: import("drizzle-orm/pg-core").PgColumn<{
            name: "title";
            tableName: "suggestions";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        description: import("drizzle-orm/pg-core").PgColumn<{
            name: "description";
            tableName: "suggestions";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        action: import("drizzle-orm/pg-core").PgColumn<{
            name: "action";
            tableName: "suggestions";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        riskPosture: import("drizzle-orm/pg-core").PgColumn<{
            name: "risk_posture";
            tableName: "suggestions";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "low" | "medium" | "high" | "critical" | "safe";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: ["safe", "low", "medium", "high", "critical"];
            baseColumn: never;
        }, {}, {}>;
        blastRadius: import("drizzle-orm/pg-core").PgColumn<{
            name: "blast_radius";
            tableName: "suggestions";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "none" | "single-domain" | "subdomain-tree" | "related-domains" | "infrastructure" | "organization-wide";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: ["none", "single-domain", "subdomain-tree", "related-domains", "infrastructure", "organization-wide"];
            baseColumn: never;
        }, {}, {}>;
        reviewOnly: import("drizzle-orm/pg-core").PgColumn<{
            name: "review_only";
            tableName: "suggestions";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        appliedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "applied_at";
            tableName: "suggestions";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        appliedBy: import("drizzle-orm/pg-core").PgColumn<{
            name: "applied_by";
            tableName: "suggestions";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        dismissedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "dismissed_at";
            tableName: "suggestions";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        dismissedBy: import("drizzle-orm/pg-core").PgColumn<{
            name: "dismissed_by";
            tableName: "suggestions";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        dismissalReason: import("drizzle-orm/pg-core").PgColumn<{
            name: "dismissal_reason";
            tableName: "suggestions";
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
            tableName: "suggestions";
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
export declare const domainNotes: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "domain_notes";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "domain_notes";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        domainId: import("drizzle-orm/pg-core").PgColumn<{
            name: "domain_id";
            tableName: "domain_notes";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        content: import("drizzle-orm/pg-core").PgColumn<{
            name: "content";
            tableName: "domain_notes";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        createdBy: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_by";
            tableName: "domain_notes";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        tenantId: import("drizzle-orm/pg-core").PgColumn<{
            name: "tenant_id";
            tableName: "domain_notes";
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
            tableName: "domain_notes";
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
            tableName: "domain_notes";
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
export declare const domainTags: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "domain_tags";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "domain_tags";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        domainId: import("drizzle-orm/pg-core").PgColumn<{
            name: "domain_id";
            tableName: "domain_tags";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        tag: import("drizzle-orm/pg-core").PgColumn<{
            name: "tag";
            tableName: "domain_tags";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        createdBy: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_by";
            tableName: "domain_tags";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        tenantId: import("drizzle-orm/pg-core").PgColumn<{
            name: "tenant_id";
            tableName: "domain_tags";
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
            tableName: "domain_tags";
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
export type DomainNote = typeof domainNotes.$inferSelect;
export type NewDomainNote = typeof domainNotes.$inferInsert;
export type DomainTag = typeof domainTags.$inferSelect;
export type NewDomainTag = typeof domainTags.$inferInsert;
export declare const savedFilters: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "saved_filters";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "saved_filters";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        name: import("drizzle-orm/pg-core").PgColumn<{
            name: "name";
            tableName: "saved_filters";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        description: import("drizzle-orm/pg-core").PgColumn<{
            name: "description";
            tableName: "saved_filters";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        criteria: import("drizzle-orm/pg-core").PgColumn<{
            name: "criteria";
            tableName: "saved_filters";
            dataType: "json";
            columnType: "PgJsonb";
            data: {
                domainPatterns?: string[];
                zoneManagement?: ("managed" | "unmanaged" | "unknown")[];
                findings?: {
                    types?: string[];
                    severities?: ("critical" | "high" | "medium" | "low" | "info")[];
                    minConfidence?: "certain" | "high" | "medium" | "low" | "heuristic";
                };
                tags?: string[];
                lastSnapshotWithin?: number;
            };
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        isShared: import("drizzle-orm/pg-core").PgColumn<{
            name: "is_shared";
            tableName: "saved_filters";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdBy: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_by";
            tableName: "saved_filters";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        tenantId: import("drizzle-orm/pg-core").PgColumn<{
            name: "tenant_id";
            tableName: "saved_filters";
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
            tableName: "saved_filters";
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
            tableName: "saved_filters";
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
export type SavedFilter = typeof savedFilters.$inferSelect;
export type NewSavedFilter = typeof savedFilters.$inferInsert;
export declare const auditActionEnum: import("drizzle-orm/pg-core").PgEnum<["domain_note_created", "domain_note_updated", "domain_note_deleted", "domain_tag_added", "domain_tag_removed", "filter_created", "filter_updated", "filter_deleted", "template_override_created", "template_override_updated", "template_override_deleted"]>;
export declare const auditEvents: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "audit_events";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "audit_events";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        action: import("drizzle-orm/pg-core").PgColumn<{
            name: "action";
            tableName: "audit_events";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "domain_note_created" | "domain_note_updated" | "domain_note_deleted" | "domain_tag_added" | "domain_tag_removed" | "filter_created" | "filter_updated" | "filter_deleted" | "template_override_created" | "template_override_updated" | "template_override_deleted";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: ["domain_note_created", "domain_note_updated", "domain_note_deleted", "domain_tag_added", "domain_tag_removed", "filter_created", "filter_updated", "filter_deleted", "template_override_created", "template_override_updated", "template_override_deleted"];
            baseColumn: never;
        }, {}, {}>;
        entityType: import("drizzle-orm/pg-core").PgColumn<{
            name: "entity_type";
            tableName: "audit_events";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        entityId: import("drizzle-orm/pg-core").PgColumn<{
            name: "entity_id";
            tableName: "audit_events";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        previousValue: import("drizzle-orm/pg-core").PgColumn<{
            name: "previous_value";
            tableName: "audit_events";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        newValue: import("drizzle-orm/pg-core").PgColumn<{
            name: "new_value";
            tableName: "audit_events";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        actorId: import("drizzle-orm/pg-core").PgColumn<{
            name: "actor_id";
            tableName: "audit_events";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        actorEmail: import("drizzle-orm/pg-core").PgColumn<{
            name: "actor_email";
            tableName: "audit_events";
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
            tableName: "audit_events";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        ipAddress: import("drizzle-orm/pg-core").PgColumn<{
            name: "ip_address";
            tableName: "audit_events";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        userAgent: import("drizzle-orm/pg-core").PgColumn<{
            name: "user_agent";
            tableName: "audit_events";
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
            tableName: "audit_events";
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
export type AuditEvent = typeof auditEvents.$inferSelect;
export type NewAuditEvent = typeof auditEvents.$inferInsert;
export declare const templateOverrides: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "template_overrides";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "template_overrides";
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
            tableName: "template_overrides";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        templateKey: import("drizzle-orm/pg-core").PgColumn<{
            name: "template_key";
            tableName: "template_overrides";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        overrideData: import("drizzle-orm/pg-core").PgColumn<{
            name: "override_data";
            tableName: "template_overrides";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        appliesToDomains: import("drizzle-orm/pg-core").PgColumn<{
            name: "applies_to_domains";
            tableName: "template_overrides";
            dataType: "json";
            columnType: "PgJsonb";
            data: string[];
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdBy: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_by";
            tableName: "template_overrides";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        tenantId: import("drizzle-orm/pg-core").PgColumn<{
            name: "tenant_id";
            tableName: "template_overrides";
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
            tableName: "template_overrides";
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
            tableName: "template_overrides";
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
export type TemplateOverride = typeof templateOverrides.$inferSelect;
export type NewTemplateOverride = typeof templateOverrides.$inferInsert;
export declare const monitoringScheduleEnum: import("drizzle-orm/pg-core").PgEnum<["hourly", "daily", "weekly"]>;
export declare const monitoredDomains: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "monitored_domains";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "monitored_domains";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        domainId: import("drizzle-orm/pg-core").PgColumn<{
            name: "domain_id";
            tableName: "monitored_domains";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        schedule: import("drizzle-orm/pg-core").PgColumn<{
            name: "schedule";
            tableName: "monitored_domains";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "hourly" | "daily" | "weekly";
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: ["hourly", "daily", "weekly"];
            baseColumn: never;
        }, {}, {}>;
        alertChannels: import("drizzle-orm/pg-core").PgColumn<{
            name: "alert_channels";
            tableName: "monitored_domains";
            dataType: "json";
            columnType: "PgJsonb";
            data: {
                email?: string[];
                webhook?: string;
                slack?: string;
            };
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        maxAlertsPerDay: import("drizzle-orm/pg-core").PgColumn<{
            name: "max_alerts_per_day";
            tableName: "monitored_domains";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        suppressionWindowMinutes: import("drizzle-orm/pg-core").PgColumn<{
            name: "suppression_window_minutes";
            tableName: "monitored_domains";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        isActive: import("drizzle-orm/pg-core").PgColumn<{
            name: "is_active";
            tableName: "monitored_domains";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        lastCheckAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "last_check_at";
            tableName: "monitored_domains";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        lastAlertAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "last_alert_at";
            tableName: "monitored_domains";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        createdBy: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_by";
            tableName: "monitored_domains";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        tenantId: import("drizzle-orm/pg-core").PgColumn<{
            name: "tenant_id";
            tableName: "monitored_domains";
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
            tableName: "monitored_domains";
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
            tableName: "monitored_domains";
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
export type MonitoredDomain = typeof monitoredDomains.$inferSelect;
export type NewMonitoredDomain = typeof monitoredDomains.$inferInsert;
export declare const alertStatusEnum: import("drizzle-orm/pg-core").PgEnum<["pending", "sent", "suppressed", "acknowledged", "resolved"]>;
export declare const alerts: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "alerts";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "alerts";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        monitoredDomainId: import("drizzle-orm/pg-core").PgColumn<{
            name: "monitored_domain_id";
            tableName: "alerts";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        title: import("drizzle-orm/pg-core").PgColumn<{
            name: "title";
            tableName: "alerts";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        description: import("drizzle-orm/pg-core").PgColumn<{
            name: "description";
            tableName: "alerts";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        severity: import("drizzle-orm/pg-core").PgColumn<{
            name: "severity";
            tableName: "alerts";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "low" | "medium" | "high" | "critical" | "info";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: ["critical", "high", "medium", "low", "info"];
            baseColumn: never;
        }, {}, {}>;
        triggeredByFindingId: import("drizzle-orm/pg-core").PgColumn<{
            name: "triggered_by_finding_id";
            tableName: "alerts";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        status: import("drizzle-orm/pg-core").PgColumn<{
            name: "status";
            tableName: "alerts";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "resolved" | "pending" | "sent" | "suppressed" | "acknowledged";
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: ["pending", "sent", "suppressed", "acknowledged", "resolved"];
            baseColumn: never;
        }, {}, {}>;
        dedupKey: import("drizzle-orm/pg-core").PgColumn<{
            name: "dedup_key";
            tableName: "alerts";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        acknowledgedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "acknowledged_at";
            tableName: "alerts";
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
            tableName: "alerts";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        resolvedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "resolved_at";
            tableName: "alerts";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        resolutionNote: import("drizzle-orm/pg-core").PgColumn<{
            name: "resolution_note";
            tableName: "alerts";
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
            tableName: "alerts";
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
            tableName: "alerts";
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
export type Alert = typeof alerts.$inferSelect;
export type NewAlert = typeof alerts.$inferInsert;
export { type NewRemediationRequest, type RemediationRequest, remediationPriorityEnum, remediationRequests, remediationStatusEnum, } from './remediation.js';
export { type DkimSelector, dkimSelectors, type MailEvidence, mailEvidence, mailProviderEnum, type NewDkimSelector, type NewMailEvidence, selectorConfidenceEnum, selectorProvenanceEnum, } from './mail.js';
export { adjudicationEnum, baselineStatusEnum, type FieldComparison, fieldComparisonStatusEnum, type LegacyAccessLog, type LegacyToolOutput, legacyAccessLogs, legacyToolTypeEnum, type MismatchReport, mismatchReports, type NewLegacyAccessLog, type NewMismatchReport, type NewProviderBaseline, type NewShadowComparison, type ProviderBaseline, type ProviderBaselineData, providerBaselines, type ShadowComparison, shadowComparisons, shadowStatusEnum, } from './parity.js';
//# sourceMappingURL=index.d.ts.map