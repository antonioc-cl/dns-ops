# Data Model Documentation

This document describes key data model decisions and patterns in the DNS Ops database schema.

## Reference Integrity Strategy

### Hard References (FK Constraints)

Most entity relationships use foreign key constraints with appropriate cascade rules:

| Parent | Child | ON DELETE | Rationale |
|--------|-------|-----------|-----------|
| `domains` | `snapshots` | CASCADE | Snapshot data is meaningless without domain |
| `domains` | `domain_notes` | CASCADE | Notes belong to domain lifecycle |
| `domains` | `domain_tags` | CASCADE | Tags belong to domain lifecycle |
| `domains` | `monitored_domains` | CASCADE | Monitoring config tied to domain |
| `snapshots` | `observations` | CASCADE | Observations are snapshot-specific |
| `snapshots` | `record_sets` | CASCADE | Record sets are snapshot-specific |
| `snapshots` | `findings` | CASCADE | Findings are snapshot-specific |
| `snapshots` | `dkim_selectors` | CASCADE | DKIM selectors are snapshot-specific |
| `snapshots` | `mail_evidence` | CASCADE | Mail evidence is snapshot-specific |
| `findings` | `suggestions` | CASCADE | Suggestions belong to findings |
| `monitored_domains` | `alerts` | CASCADE | Alerts belong to monitoring config |
| `vantage_points` | `observations` | SET NULL* | Preserve observation if vantage deleted |

### Soft References (No FK Constraint)

Some relationships intentionally omit FK constraints:

#### `remediation_requests.snapshot_id`

**Status:** SOFT REFERENCE (documented exception)

**Rationale:**
1. Remediation requests have a longer lifecycle than snapshots
2. Snapshots may be archived/pruned while remediation is ongoing
3. Requests can originate from external systems without a snapshot
4. Decouples remediation module from core snapshot module

**Application Handling:**
- Validate snapshot_id on creation if provided
- Use LEFT JOIN when querying to handle missing snapshots
- Display "snapshot unavailable" in UI when reference is stale

**Decision:** dns-ops-1j4.4.3 (2026-03-20)

---

## Enum Definitions

Enums are defined in PostgreSQL for type safety and validation:

| Enum | Values | Used By |
|------|--------|---------|
| `result_state` | complete, partial, failed | snapshots |
| `severity` | critical, high, medium, low, info | findings, alerts |
| `confidence` | certain, high, medium, low, heuristic | findings |
| `risk_posture` | safe, low, medium, high, critical | findings, suggestions |
| `blast_radius` | none, single-domain, ..., organization-wide | findings, suggestions |
| `zone_management` | managed, unmanaged, unknown | domains, snapshots |
| `vantage_type` | public-recursive, authoritative, parent-zone, probe | vantage_points |
| `collection_status` | success, timeout, refused, truncated, nxdomain, nodata, error | observations |
| `audit_action` | domain_note_created, ..., template_override_deleted | audit_events |
| `monitoring_schedule` | hourly, daily, weekly | monitored_domains |
| `alert_status` | pending, sent, suppressed, acknowledged, resolved | alerts |
| `remediation_status` | open, in-progress, resolved, closed | remediation_requests |
| `remediation_priority` | low, medium, high, critical | remediation_requests |
| `selector_provenance` | managed-zone-config, ..., not-found | dkim_selectors |
| `selector_confidence` | certain, high, medium, low, heuristic | dkim_selectors |
| `mail_provider` | google-workspace, microsoft-365, ..., unknown | dkim_selectors, mail_evidence |

---

## Index Strategy

### Primary Patterns

1. **Foreign Key Indexes**: All FK columns have indexes for join performance
2. **Tenant Isolation**: `tenant_id` columns indexed for multi-tenant queries
3. **Time-Series Access**: `created_at` indexed for chronological queries
4. **Composite Indexes**: Common query patterns get composite indexes

### Notable Composite Indexes

| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|
| snapshots | snapshot_domain_created_idx | domain_id, created_at | Latest snapshot per domain |
| observations | observation_query_idx | query_name, query_type | Find observations by query |
| record_sets | recordset_name_type_idx | name, type | DNS record lookup |
| domain_tags | domain_tag_unique_idx | domain_id, tag | Prevent duplicate tags |

---

## Schema Evolution

### Migration Strategy

- All schema changes go through Drizzle migrations
- Verify migrations with `npm run verify-migrations`
- Never modify migration files after they're applied

### Adding New Tables

1. Define table in appropriate schema file (`index.ts`, `mail.ts`, `remediation.ts`)
2. Export types from schema file
3. Run `npm run generate` to create migration
4. Verify with `npm run verify-migrations`
5. Update this documentation if introducing soft references

### Schema Drift Detection

See `SCHEMA_AUDIT.md` for current drift analysis between TypeScript definitions and SQL migrations.
