# Index & Constraint Audit

> Generated: 2026-03-20
> Bead: dns-ops-1j4.4.7

## Summary

This document audits database indices against actual query patterns in the repository layer. The goal is to ensure indices support common workloads and the multi-tenant model.

## Index Coverage by Table

### domains

| Index | Columns | Query Pattern | Status |
|-------|---------|---------------|--------|
| `domain_tenant_idx` | `tenantId` | Portfolio listing by tenant | OK |
| `domain_zone_management_idx` | `zoneManagement` | Filter managed vs unmanaged | OK |
| **Missing** | `normalizedName` | Lookup by domain name | RECOMMEND |

**Recommendation**: Add index on `normalizedName` for fast domain lookups.

### snapshots

| Index | Columns | Query Pattern | Status |
|-------|---------|---------------|--------|
| `snapshot_domain_idx` | `domainId` | Get snapshots for domain | OK |
| `snapshot_created_at_idx` | `createdAt` | Recent snapshots | OK |
| `snapshot_domain_created_idx` | `domainId, createdAt` | Latest per domain | OK |
| `snapshot_state_idx` | `resultState` | Filter by state | OK |

**Status**: Well indexed for history and monitoring queries.

### observations

| Index | Columns | Query Pattern | Status |
|-------|---------|---------------|--------|
| `observation_snapshot_idx` | `snapshotId` | Get observations for snapshot | OK |
| `observation_query_idx` | `queryName, queryType` | DNS record lookup | OK |
| `observation_vantage_idx` | `vantageId` | Filter by vantage (unused) | LOW VALUE |
| `observation_status_idx` | `status` | Filter by collection status | OK |

**Note**: `vantageId` index is unused since vantage info is stored inline.

### findings

| Index | Columns | Query Pattern | Status |
|-------|---------|---------------|--------|
| `finding_snapshot_idx` | `snapshotId` | Get findings for snapshot | OK |
| `finding_type_idx` | `type` | Filter by finding type | OK |
| `finding_severity_idx` | `severity` | Filter by severity | OK |
| `finding_review_only_idx` | `reviewOnly` | Filter automated vs review | OK |
| `finding_ruleset_version_idx` | `rulesetVersionId` | Find by ruleset version | OK |

**Status**: Comprehensive coverage for findings queries.

### monitored_domains

| Index | Columns | Query Pattern | Status |
|-------|---------|---------------|--------|
| `monitored_domain_tenant_idx` | `tenantId` | List by tenant | OK |
| `monitored_domain_active_idx` | `isActive` | Filter active only | OK |
| `monitored_domain_schedule_idx` | `schedule` | Find by schedule | OK |

**Status**: Good coverage for monitoring workload.

### alerts

| Index | Columns | Query Pattern | Status |
|-------|---------|---------------|--------|
| `alert_monitored_idx` | `monitoredDomainId` | Alerts for domain | OK |
| `alert_status_idx` | `status` | Filter by status | OK |
| `alert_tenant_idx` | `tenantId` | List by tenant | OK |
| `alert_dedup_idx` | `dedupKey` | Deduplication check | OK |
| `alert_created_idx` | `createdAt` | Recent alerts | OK |

**Status**: Well indexed for alert management.

---

## Tenant Isolation Analysis

All multi-tenant tables have `tenantId` indices:
- domains: `domain_tenant_idx`
- domain_notes: `domain_note_tenant_idx`
- domain_tags: `domain_tag_tenant_idx`
- saved_filters: `saved_filter_tenant_idx`
- audit_events: `audit_tenant_idx`
- template_overrides: `template_override_tenant_idx`
- monitored_domains: `monitored_domain_tenant_idx`
- alerts: `alert_tenant_idx`

**Status**: Tenant isolation is properly indexed.

---

## Uniqueness Constraints

| Table | Constraint | Columns |
|-------|------------|---------|
| domains | unique | `normalizedName` |
| snapshots | unique | `id` (PK only) |
| findings | unique | `snapshotId, ruleId, ruleVersion, type` (composite) |
| suggestions | unique | `id` (PK only) |
| domain_tags | unique | `domainId, tag` |
| dkim_selectors | unique | `snapshotId, domain, selector` |

**Status**: Appropriate uniqueness constraints in place.

---

## Recommendations

1. **Consider adding**: `domains.normalizedName` index if not already unique
2. **Consider removing**: `observation_vantage_idx` (unused, vantageId is nullable/unused)
3. **Monitor query plans**: Use `EXPLAIN ANALYZE` in production to validate index usage

---

## Files Analyzed

- `packages/db/src/schema/index.ts` - Main schema with indices
- `packages/db/src/repos/*.ts` - Repository query patterns
