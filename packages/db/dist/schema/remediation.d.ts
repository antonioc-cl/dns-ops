/**
 * Remediation Request Schema
 *
 * Tracks remediation requests for mail configuration issues.
 * Allows operators to request fixes for DMARC/DKIM/SPF problems.
 */
export declare const remediationStatusEnum: import("drizzle-orm/pg-core").PgEnum<["open", "in-progress", "resolved", "closed"]>;
export declare const remediationPriorityEnum: import("drizzle-orm/pg-core").PgEnum<["low", "medium", "high", "critical"]>;
export declare const remediationRequests: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "remediation_requests";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "remediation_requests";
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
            tableName: "remediation_requests";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        domain: import("drizzle-orm/pg-core").PgColumn<{
            name: "domain";
            tableName: "remediation_requests";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        contactEmail: import("drizzle-orm/pg-core").PgColumn<{
            name: "contact_email";
            tableName: "remediation_requests";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        contactName: import("drizzle-orm/pg-core").PgColumn<{
            name: "contact_name";
            tableName: "remediation_requests";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        contactPhone: import("drizzle-orm/pg-core").PgColumn<{
            name: "contact_phone";
            tableName: "remediation_requests";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        issues: import("drizzle-orm/pg-core").PgColumn<{
            name: "issues";
            tableName: "remediation_requests";
            dataType: "json";
            columnType: "PgJsonb";
            data: string[];
            driverParam: unknown;
            notNull: true;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        priority: import("drizzle-orm/pg-core").PgColumn<{
            name: "priority";
            tableName: "remediation_requests";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "critical" | "high" | "medium" | "low";
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: ["low", "medium", "high", "critical"];
            baseColumn: never;
        }, {}, {}>;
        notes: import("drizzle-orm/pg-core").PgColumn<{
            name: "notes";
            tableName: "remediation_requests";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        status: import("drizzle-orm/pg-core").PgColumn<{
            name: "status";
            tableName: "remediation_requests";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "resolved" | "closed" | "open" | "in-progress";
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: ["open", "in-progress", "resolved", "closed"];
            baseColumn: never;
        }, {}, {}>;
        assignedTo: import("drizzle-orm/pg-core").PgColumn<{
            name: "assigned_to";
            tableName: "remediation_requests";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "remediation_requests";
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
            tableName: "remediation_requests";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        resolvedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "resolved_at";
            tableName: "remediation_requests";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export type RemediationRequest = typeof remediationRequests.$inferSelect;
export type NewRemediationRequest = typeof remediationRequests.$inferInsert;
//# sourceMappingURL=remediation.d.ts.map