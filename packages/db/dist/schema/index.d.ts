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
            data: "managed" | "unmanaged" | "unknown";
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
            data: "partial" | "complete" | "failed";
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
            data: "managed" | "unmanaged" | "unknown";
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
                hasDelegationData?: boolean;
                parentZone?: string;
                nsServers?: string[];
                hasDivergence?: boolean;
                lameDelegations?: number;
                hasDnssec?: boolean;
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
            data: "success" | "timeout" | "refused" | "truncated" | "nxdomain" | "nodata" | "error";
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
            data: unknown;
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
            data: "critical" | "high" | "medium" | "low" | "info";
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
            data: "high" | "medium" | "low" | "certain" | "heuristic";
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
            data: "critical" | "high" | "medium" | "low" | "safe";
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
            data: "critical" | "high" | "medium" | "low" | "safe";
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
export { remediationRequests, remediationStatusEnum, remediationPriorityEnum, type RemediationRequest, type NewRemediationRequest, } from './remediation';
//# sourceMappingURL=index.d.ts.map