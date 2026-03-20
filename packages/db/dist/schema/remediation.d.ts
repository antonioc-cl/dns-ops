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
            data: "low" | "medium" | "high" | "critical";
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
            data: "open" | "in-progress" | "resolved" | "closed";
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