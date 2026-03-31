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

## Collection Patterns

### Synchronous vs Asynchronous Collection

The collector supports two patterns for DNS collection:

| Pattern | Endpoint | Use Case | Redis Required |
|---------|----------|----------|----------------|
| Synchronous | `POST /api/collect/domain` | Ad-hoc single domain checks | No |
| Asynchronous | Job Queue | Scheduled monitoring, fleet reports | Yes |

#### Synchronous Single-Domain Collection

Single-domain collection runs synchronously by design. This decision provides:

1. **Immediate Feedback**: Users get instant results without polling or websockets
2. **No Redis Dependency**: Works without infrastructure overhead for basic usage
3. **Simpler Error Handling**: Errors returned directly in HTTP response
4. **Request-Response Semantics**: DNS collection is fast enough (<5s typically)

The job queue (BullMQ) exists but is intentionally NOT used for single-domain ad-hoc
collection. See `apps/collector/src/jobs/collect-domain.ts` for implementation details.

#### When to Use the Job Queue

- Scheduled monitoring refreshes (`scheduleMonitoringJob`)
- Fleet report generation (`getReportsQueue`)
- Bulk domain processing (future: batch collection endpoint)

## Authoritative Querying

### Current Limitation (DNS-001)

**True authoritative DNS querying is NOT yet implemented.**

The current implementation uses Node.js's built-in `dns` module, which has a
critical limitation: it does not expose the AA (Authoritative Answer) flag from
DNS responses. This means:

1. **AA flag is always false** in query results, regardless of whether the
   response actually came from an authoritative server
2. **Lame delegation detection is limited** - we can only detect failures
   (timeouts, refused, errors), not truly non-authoritative responses
3. **DNSSEC validation source metadata is incomplete** - AD (Authentic Data)
   flag is also not reliably available

### Workaround

The current "authoritative" collection strategy uses `dns.setServers()` to
query specific nameservers, but this doesn't guarantee authoritative responses
and cannot verify the AA flag.

### Future Implementation

To enable true authoritative querying with AA flag detection:

1. **Use dns-packet library**: Send raw UDP/TCP DNS queries
2. **Parse response flags directly**: Extract AA, AD, TC bits from response
3. **Implement EDNS0 support**: Handle larger responses and DNSSEC

```typescript
// Future implementation sketch
import * as dnsPacket from 'dns-packet';
import * as dgram from 'node:dgram';

function queryAuthoritative(
  name: string,
  type: string,
  nameserver: string
): Promise<DNSQueryResult> {
  const socket = dgram.createSocket('udp4');
  const query = dnsPacket.encode({
    type: 'query',
    id: Math.floor(Math.random() * 65535),
    flags: dnsPacket.RECURSION_DESIRED,
    questions: [{ name, type }],
  });

  return new Promise((resolve, reject) => {
    socket.send(query, 53, nameserver, (err) => {
      if (err) reject(err);
    });

    socket.once('message', (response) => {
      const decoded = dnsPacket.decode(response);
      resolve({
        ...,
        flags: {
          aa: decoded.flags & dnsPacket.AUTHORITATIVE_ANSWER !== 0,
          ad: decoded.flags & dnsPacket.AUTHENTIC_DATA !== 0,
          // ... other flags
        },
      });
    });
  });
}
```

### Impact on Delegation Detection

Until true authoritative querying is implemented:

- `DelegationCollector.detectLameDelegation()` only reports actual failures
  (timeout, refused, error), not non-authoritative responses
- The `not-authoritative` reason code is currently unused
- Users may see "successful" responses from servers that aren't actually
  authoritative for the zone

This is a known limitation tracked as DNS-001.

## Related Documents

- [Query Scope](../rules/query-scope.md) - DNS query policies
- [Trust Boundary](../rules/trust-boundary.md) - Probe policies
- [REPO_STRUCTURE.md](../../REPO_STRUCTURE.md) - Monorepo layout
