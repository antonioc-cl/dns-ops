# DNS Ops Workbench

DNS + mail operations platform with deterministic rules engine, DNS change simulation, and multi-tenant operator workflows.

## Architecture

Split runtime:

- **`apps/web`** — TanStack Start + Hono on Cloudflare Workers (UI + API)
- **`apps/collector`** — Node.js service for DNS collection, probes, and background jobs
- **`packages/db`** — PostgreSQL/Drizzle schema + repositories
- **`packages/rules`** — Deterministic rules engine (DNS + mail rules, simulation engine)
- **`packages/contracts`** — Shared TypeScript types, DTOs, enums
- **`packages/parsing`** — DNS/mail/IDN parsing utilities
- **`packages/logging`** — Structured logging + metrics
- **`packages/testkit`** — Benchmark corpus and test fixtures

## Repo layout

```text
dns-ops/
├── apps/
│   ├── web/              # Workers-based web app + API
│   └── collector/        # Node.js DNS collection service
├── packages/
│   ├── contracts/        # Shared types and DTOs
│   ├── db/               # Drizzle ORM schema + repos
│   ├── parsing/          # DNS/mail parsing
│   ├── rules/            # Rules engine + simulation
│   ├── logging/          # Structured logging
│   └── testkit/          # Test fixtures
├── docs/
└── beads/
```

## Current product truth

### Domain 360 (`/domain/:domain`)

- **Overview** — stat cards, query scope, notes, tags, DNS change simulation panel
- **DNS** — delegation, snapshots, findings, selectors, record diffs, shadow comparison
- **Mail** — mail diagnostics, mail findings, remediation tracking

### Portfolio (`/portfolio`)

- Portfolio search with debounced filtering
- Saved filters (create, load, share, metadata-only edit)
- Monitored domains (CRUD, toggle, cross-links to Domain 360)
- Alerts (acknowledge, resolve, suppress, cross-links to Domain 360)
- Fleet reports (same-origin proxy to collector)
- Shared reports (create, expire, token-based sharing)
- Template overrides (provider-aligned override management)
- Audit log (monitoring, alert, remediation, shared-report events)

### DNS Change Simulation Engine

The simulation engine closes the operational loop: **finding detected → fix proposed → dry-run verified → operator sees impact before acting**.

- `POST /api/simulate` — takes a snapshot or finding, generates concrete DNS record mutations, dry-runs them through the rules engine
- `GET /api/simulate/actionable-types` — returns fixable finding types
- Provider-aware fixes for Google Workspace, Microsoft 365, Amazon SES, SendGrid, Mailgun
- Supports 8 finding types: SPF, DMARC, MX, MTA-STS, TLS-RPT, DKIM, SPF malformed, CNAME conflicts
- 100% deterministic — no AI/LLM, reuses existing rules engine + provider templates

### Backend

- Authoritative datastore: **PostgreSQL only**
- Web runtime: Cloudflare Workers + PostgreSQL connection config
- Collector runtime: Node.js + direct PostgreSQL + Redis (queue-backed jobs)
- Collector public health: `/health`, `/healthz`, `/readyz`
- Collector `/api/*` requires service auth
- All write paths tenant-scoped with actor attribution
- Monitoring, alert, remediation, shared-report mutations emit persisted audit events
- `401` vs `403` properly distinguished across all operator surfaces

### Test coverage

- **2187 tests** (112 test files) — tenant isolation, auth, and integration tests comprehensive
- Well-covered: rules engine, auth, monitoring, alerts, portfolio, parsing
- All write paths require auth with tenant isolation enforced at schema, repository, and route layers
- Runtime route tests follow mock-DB + `app.request()` pattern

## Setup

Prereqs:

- Bun 1.3.11+
- PostgreSQL 15+
- Redis 7+ (for queue-backed collector jobs)

```bash
bun install
cp .env.example .env
```

## Database

```bash
cd packages/db
bun run build
bun run generate
bun run check-drift
DATABASE_URL=postgres://... bun run verify-migrations
```

## Run

```bash
bun dev
# or individually
bun run --filter @dns-ops/web dev
bun run --filter @dns-ops/collector dev
```

## Validation

```bash
bun run lint
bun run typecheck
bun run test
bun run build
bun run smoke-test
```

E2E smoke (requires running dev server):

```bash
E2E_DEV_TENANT=test-tenant E2E_DEV_ACTOR=test-actor bun run --filter @dns-ops/web e2e
```

Optional live-network DNS smoke (opt-in, not in default gate):

```bash
RUN_LIVE_DNS_TESTS=1 bun run test:live-dns
```

Live DNS fixture env vars:

- `LIVE_DNS_RESOLVER_PRIMARY`
- `LIVE_DNS_RESOLVER_SECONDARY`
- `LIVE_DNS_DOMAIN`
- `LIVE_DNS_MAIL_DOMAIN`
- `LIVE_DNS_AUTHORITATIVE_DOMAIN`
- `LIVE_DNS_AUTHORITATIVE_NS_IP`

## API routes

| Route group | Path prefix | Auth | Description |
|---|---|---|---|
| Snapshots | `/api/snapshots` | Tenant-scoped | DNS snapshot CRUD, latest, diff |
| Findings | `/api/findings` | Tenant-scoped | Rule evaluation, acknowledge, false-positive |
| Selectors | `/api/selectors` | Tenant-scoped | Persisted DNS selectors |
| Simulation | `/api/simulate` | Tenant-scoped | DNS change simulation + dry-run |
| Mail | `/api/mail` | Tenant-scoped | Mail diagnostics, remediation |
| Monitoring | `/api/monitoring` | Tenant-scoped | Domain monitoring CRUD + toggle |
| Alerts | `/api/alerts` | Tenant-scoped | Alert lifecycle (ack/resolve/suppress) |
| Portfolio | `/api/portfolio` | Tenant-scoped | Search, filters, tags, reports, overrides, audit |
| Fleet reports | `/api/fleet-report` | Tenant-scoped | Collector proxy for fleet reports |
| Shadow comparison | `/api/shadow` | Tenant-scoped | Provider shadow comparison |
| Legacy tools | `/api/legacy-tools` | Tenant-scoped | DMARC/DKIM deeplinks, shadow stats |
| Delegation | `/api/delegation` | Public reads | NS delegation + DNSSEC evidence |
| Domain reads | `/api/snapshots`, `/api/findings` | Public reads | Unscoped domain reads |

## Beads

This repo uses `br` for issue tracking:

```bash
br sync --flush-only
```

## Key docs

- `STATUS_REPORT.md` — current validation truth
- `docs/architecture/runtime-topology.md`
- `docs/rules/query-scope.md`
- `docs/rules/trust-boundary.md`
- `packages/contracts/docs/API_REFERENCE.md`