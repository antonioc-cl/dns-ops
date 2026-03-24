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
| `ruleset_versions` | Shared rule definitions |
| `remediation_requests` | Cross-tenant support workflow (isolated by domain) |

> **Note:** `vantage_points` table was de-scoped in PR-12.3 (migration 0006).

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

## Domain Uniqueness (Multi-Tenant)

### Implementation

**Solution:** The `domains` table uses a composite unique index on `(normalized_name, tenant_id)`.

```sql
-- Current index (from schema)
CREATE UNIQUE INDEX domain_name_tenant_idx ON domains (normalized_name, tenant_id);
```

**Behavior:**
- Same domain name can be registered by different tenants (e.g., `example.com` for tenant A and tenant B)
- `tenant_id = NULL` is allowed for system/unowned domains
- PostgreSQL treats NULL values as distinct in unique constraints

### Benefits

1. **Multi-tenant isolation**: Each tenant can manage their own copy of any domain
2. **Import/transfer flexibility**: Domain ownership can be transferred between tenants
3. **Development flexibility**: Test and production tenants can have overlapping domain names

### Migration History

- **Migration 0007**: Changed from single-column to composite unique index
- **Migration script**: `packages/db/src/migrations/0007_tenant_domain_uniqueness.sql`

### Schema Link

See `packages/db/src/schema/index.ts` for the `domains` table definition.

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

**Document Updated:** 2026-03-24
**Decision Owner:** dns-ops-1j4.4.4
