# Tenant Isolation Strategy

This document describes the multi-tenancy approach for DNS Ops Workbench.

## Current Implementation: Application-Level Isolation

### Decision

**Status:** Application-level tenant isolation (no PostgreSQL RLS)

**Rationale:**
1. **Runtime Diversity**: Production uses Cloudflare D1 which doesn't support PostgreSQL RLS
2. **Development Flexibility**: PostgreSQL is only used in local development
3. **Performance**: Application-level filtering avoids RLS overhead
4. **Simplicity**: Single isolation model across all database adapters

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Application Layer                    │
├─────────────────────────────────────────────────────────┤
│  Auth Middleware: Extracts tenantId from request        │
│  ↓                                                      │
│  Repository Layer: Adds WHERE tenant_id = ? to queries  │
│  ↓                                                      │
│  Database Adapter: Executes filtered queries            │
└─────────────────────────────────────────────────────────┘
```

---

## Tenant-Aware Tables

The following tables include `tenant_id` columns for isolation:

| Table | Column | Type | Required |
|-------|--------|------|----------|
| `domains` | `tenant_id` | UUID | No* |
| `domain_notes` | `tenant_id` | UUID | No* |
| `domain_tags` | `tenant_id` | UUID | No* |
| `saved_filters` | `tenant_id` | UUID | No* |
| `audit_events` | `tenant_id` | UUID | No* |
| `template_overrides` | `tenant_id` | UUID | No* |
| `monitored_domains` | `tenant_id` | UUID | No* |
| `alerts` | `tenant_id` | UUID | No* |

*Currently optional for single-tenant deployments. Can be made required when multi-tenancy is enabled.

### Tables Without Tenant ID

These tables are tenant-isolated through their parent relationships:

| Table | Isolation Through |
|-------|-------------------|
| `snapshots` | `domain_id` → `domains.tenant_id` |
| `observations` | `snapshot_id` → `snapshots` → `domains.tenant_id` |
| `record_sets` | `snapshot_id` → `snapshots` → `domains.tenant_id` |
| `findings` | `snapshot_id` → `snapshots` → `domains.tenant_id` |
| `suggestions` | `finding_id` → `findings` → `snapshots` → `domains.tenant_id` |
| `dkim_selectors` | `snapshot_id` → `snapshots` → `domains.tenant_id` |
| `mail_evidence` | `snapshot_id` → `snapshots` → `domains.tenant_id` |

### System Tables (No Tenant Isolation)

| Table | Reason |
|-------|--------|
| `vantage_points` | Shared infrastructure |
| `ruleset_versions` | Shared rule definitions |
| `remediation_requests` | Cross-tenant support workflow (isolated by domain) |

---

## Implementation Guidelines

### Repository Pattern

All tenant-aware repositories MUST:

1. Accept `tenantId` as a parameter on queries
2. Add `WHERE tenant_id = ?` to all SELECT queries
3. Set `tenant_id` on all INSERT operations
4. Validate tenant ownership before UPDATE/DELETE

Example:
```typescript
async findByTenant(tenantId: string): Promise<Domain[]> {
  return this.db.select(domains).where(eq(domains.tenantId, tenantId));
}
```

### Cross-Tenant Prevention

The application layer enforces these rules:

1. **Request Context**: `tenantId` is extracted from authenticated request
2. **Middleware Validation**: Auth middleware rejects requests without valid tenant
3. **Repository Enforcement**: Repositories always filter by tenant
4. **No Direct DB Access**: Application code never bypasses repository layer

### Audit Trail

All tenant-scoped operations are logged in `audit_events` with:
- `tenant_id`: The tenant performing the action
- `actor_id`: The user within the tenant
- `action`: The operation performed
- `entity_id`: The affected resource

---

## Future Considerations

### PostgreSQL RLS Migration Path

If RLS is needed for PostgreSQL deployments:

1. Create RLS policies for each tenant-aware table:
   ```sql
   ALTER TABLE domains ENABLE ROW LEVEL SECURITY;

   CREATE POLICY domains_tenant_isolation ON domains
     USING (tenant_id = current_setting('app.current_tenant')::uuid);
   ```

2. Set tenant context before queries:
   ```sql
   SET app.current_tenant = '<tenant-uuid>';
   ```

3. This would be PostgreSQL-specific and wouldn't apply to D1

### D1 Considerations

Cloudflare D1 doesn't support RLS. For D1 deployments:
- Continue using application-level isolation
- Consider separate D1 databases per tenant for strict isolation
- Use Cloudflare Workers isolation for request-level tenant context

---

---

## Domain Uniqueness Limitation

### Current Implementation

**Issue:** The `domains` table uses `normalized_name` alone for uniqueness.

```sql
-- Current index (from schema)
UNIQUE INDEX domain_name_idx ON domains (normalized_name)
```

**Problem:** This prevents two tenants from owning the same domain name, even if they shouldn't have isolation conflicts (e.g., test vs production tenants).

### Impact

1. **Cross-tenant conflicts**: Tenant A cannot create `example.com` if Tenant B already has it
2. **Import/transfer issues**: Domain ownership transfer between tenants requires data migration
3. **Multi-domain deployments**: Single-tenant mode still requires unique domain names

### Migration Path

To support true multi-tenant domain isolation, change the unique index to include `tenant_id`:

```sql
-- Migration: Change from single-column to composite unique index
BEGIN;

-- 1. Drop current unique constraint
DROP INDEX domain_name_idx;

-- 2. Create composite unique index (allows same domain for different tenants)
CREATE UNIQUE INDEX domain_tenant_name_idx ON domains (tenant_id, normalized_name)
  WHERE tenant_id IS NOT NULL;

-- 3. Allow NULL tenant_id for unowned/public domains (maintains public read)
-- NULL values are not equal in PostgreSQL unique constraints

COMMIT;
```

### Backfill Requirements

If there are existing duplicate domain names:

```sql
-- 1. Find duplicates
SELECT normalized_name, COUNT(*) as count
FROM domains
WHERE tenant_id IS NOT NULL
GROUP BY normalized_name
HAVING COUNT(*) > 1;

-- 2. For each duplicate, decide:
--    a. Transfer domain to primary tenant, archive others
--    b. Merge duplicate records (if data is identical)
--    c. Contact support for resolution

-- 3. After resolution, verify no duplicates
SELECT COUNT(*) FROM domains
WHERE tenant_id IS NOT NULL
GROUP BY tenant_id, normalized_name
HAVING COUNT(*) > 1;
```

### Schema Link

See `packages/db/src/schema/domain.ts` for the current `domains` table definition.

---

## Security Checklist

When adding new tenant-aware features:

- [ ] Table includes `tenant_id` column
- [ ] Repository filters by tenant on all queries
- [ ] Repository sets tenant on all inserts
- [ ] API endpoint extracts tenant from auth context
- [ ] API validates tenant ownership before mutations
- [ ] Audit events are logged with tenant context
- [ ] Tests cover cross-tenant access prevention

---

**Decision Date:** 2026-03-20
**Decision Owner:** dns-ops-1j4.4.4
