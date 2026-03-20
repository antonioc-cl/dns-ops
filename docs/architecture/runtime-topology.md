# Runtime Topology

**Version:** 1.0
**Effective Date:** 2026-03-20
**Status:** Authoritative

## Overview

This document defines the authoritative runtime topology for the DNS Ops Workbench. It resolves all ambiguity about where product data lives and how different runtimes interact.

## Authoritative Data Store

**PostgreSQL is the single source of truth for all product data.**

| Data Type | Store | Notes |
|-----------|-------|-------|
| Domains | PostgreSQL | All domain records |
| Snapshots | PostgreSQL | Collection results |
| Observations | PostgreSQL | Individual DNS queries |
| Findings | PostgreSQL | Rules engine output |
| Suggestions | PostgreSQL | Remediation recommendations |
| Portfolios | PostgreSQL | Domain groupings |
| Audit logs | PostgreSQL | All write operations |

### Why PostgreSQL

1. **Consistency**: Both web and collector need the same data
2. **Transactions**: Complex writes require ACID guarantees
3. **Schema**: Drizzle ORM works identically for both runtimes
4. **Scalability**: Managed PostgreSQL (Neon/Supabase/RDS) handles our scale

## Runtime Contracts

### Web App (apps/web)

| Property | Value |
|----------|-------|
| Runtime | Cloudflare Workers |
| Framework | TanStack Start + Hono |
| Database Access | Hyperdrive → PostgreSQL |
| Primary Role | Read-heavy dashboard, API endpoints |
| Write Scope | Operator-triggered collection requests, portfolio management |

**Connection Flow:**
```
Cloudflare Worker → Hyperdrive (connection pooling) → PostgreSQL
```

### Collector (apps/collector)

| Property | Value |
|----------|-------|
| Runtime | Node.js (Docker container) |
| Framework | Hono |
| Database Access | Direct PostgreSQL connection |
| Primary Role | DNS collection, rules evaluation, probe execution |
| Write Scope | Snapshots, observations, findings, suggestions |

**Connection Flow:**
```
Node.js Container → PostgreSQL (direct/pooled)
```

## Environment Matrix

### Local Development

| Variable | Value | Used By |
|----------|-------|---------|
| `DATABASE_URL` | `postgresql://user@localhost:5432/dns_ops` | Both |
| `COLLECTOR_URL` | `http://localhost:3001` | Web |
| `NODE_ENV` | `development` | Both |

### Staging

| Variable | Value | Used By |
|----------|-------|---------|
| `DATABASE_URL` | `postgresql://.../dns_ops_staging` | Collector |
| `HYPERDRIVE_URL` | `hyperdrive://staging-id` | Web |
| `COLLECTOR_URL` | `https://collector-staging.example.com` | Web |
| `NODE_ENV` | `staging` | Both |

### Production

| Variable | Value | Used By |
|----------|-------|---------|
| `DATABASE_URL` | `postgresql://.../dns_ops_prod` | Collector |
| `HYPERDRIVE_URL` | `hyperdrive://prod-id` | Web |
| `COLLECTOR_URL` | `https://collector.example.com` | Web |
| `NODE_ENV` | `production` | Both |

## Wrangler Configuration (Production)

```jsonc
{
  "name": "dns-ops-web",
  "compatibility_date": "2024-01-01",
  "compatibility_flags": ["nodejs_compat"],
  "hyperdrive": [
    {
      "binding": "HYPERDRIVE",
      "id": "your-hyperdrive-id-here"
    }
  ],
  "vars": {
    "ENVIRONMENT": "production",
    "COLLECTOR_URL": "https://collector.example.com"
  }
}
```

## D1 Status

**D1 is NOT used for product data.**

D1 may be used for:
- Edge caching (read-only replicas, if needed)
- Session storage (non-critical)
- Rate limiting state

Any D1 usage must be explicitly documented and must not create data inconsistency with PostgreSQL.

## Invariants

1. **Single Source of Truth**: All product data reads and writes go to PostgreSQL
2. **No Silent Drift**: If PostgreSQL is unavailable, operations fail explicitly
3. **Consistent Schema**: Both runtimes use the same Drizzle schema from `@dns-ops/db`
4. **Explicit Fallbacks**: No automatic fallback to D1 or other stores

## Startup Validation

Both web and collector must validate their configuration at startup:

```typescript
// Pseudo-code for startup validation
function validateConfig(config: RuntimeConfig): void {
  if (!config.databaseUrl && !config.hyperdriveBinding) {
    throw new Error('DATABASE_URL or Hyperdrive binding required');
  }

  if (config.environment === 'production' && !config.collectorUrl) {
    throw new Error('COLLECTOR_URL required in production');
  }

  // Test database connection
  await testDatabaseConnection(config);
}
```

## Migration Path

### Current State (Pre-Bead 02)

- Web app has D1 binding in wrangler.jsonc
- Collector uses PostgreSQL
- Local dev uses PostgreSQL

### Target State (Post-Bead 02)

- Web app uses Hyperdrive → PostgreSQL
- Collector uses PostgreSQL (unchanged)
- Local dev uses PostgreSQL (unchanged)
- D1 bindings removed from wrangler.jsonc

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Cloudflare Edge                            │
│  ┌─────────────┐                                                │
│  │  Workers    │──── Hyperdrive ────┐                          │
│  │ (dns-ops-  │                     │                          │
│  │    web)    │                     │                          │
│  └─────────────┘                     │                          │
└─────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PostgreSQL (Neon/Supabase/RDS)               │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ domains  │ │snapshots │ │findings  │ │portfolios│           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                                       ▲
                                       │
┌─────────────────────────────────────────────────────────────────┐
│                    Container Runtime                            │
│  ┌─────────────┐                                                │
│  │  Collector  │──── Direct Connection ─────────────────────────┘
│  │ (Node.js)  │                                                 │
│  └─────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
```

## Related Documents

- [Query Scope](../rules/query-scope.md) - DNS query policies
- [Trust Boundary](../rules/trust-boundary.md) - Probe policies
- [REPO_STRUCTURE.md](../../REPO_STRUCTURE.md) - Monorepo layout
