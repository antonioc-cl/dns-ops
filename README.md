# DNS Ops Workbench

DNS + mail operations platform. Split runtime:
- `apps/web` — TanStack Start + Hono on Cloudflare Workers
- `apps/collector` — Node.js service for collection, probes, jobs
- `packages/db` — PostgreSQL/Drizzle schema + repos

## Current truth

- Authoritative datastore: **PostgreSQL only**
- Web runtime: Workers + PostgreSQL connection config
- Collector runtime: Node + direct PostgreSQL
- Collector public health endpoints: `/health`, `/healthz`, `/readyz`
- Collector `/api/*` endpoints require service auth
- Domain 360 now exposes `Overview`, `DNS`, and `Mail`, with tenant-scoped notes and tags on the overview surface
- `/portfolio` now exposes portfolio search, saved filters, monitoring, alerts, fleet reports, shared reports, template overrides, and the audit log
- Tenant-scoped remediation APIs and persisted shared-report APIs are implemented
- Monitoring, alert-state, and shared-report mutations now emit persisted audit events

## Repo layout

```text
dns-ops/
├── apps/
│   ├── web/
│   └── collector/
├── packages/
│   ├── contracts/
│   ├── db/
│   ├── parsing/
│   ├── rules/
│   ├── logging/
│   └── testkit/
├── docs/
└── beads/
```

## Setup

Prereqs:
- Bun 1.3.11+
- PostgreSQL 15+
- Redis 7+ for queue-backed collector jobs

Install:

```bash
bun install
cp .env.example .env
```

## Database

Use the DB package scripts from `packages/db`:

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
bun run typecheck
bun run test
bun run build
bun run lint
bun run smoke-test
```

Optional live-network DNS smoke (public live DNS by default, with optional controllable authoritative fixtures):

```bash
bun run test:live-dns
```

`bun run test` is deterministic by default; the live DNS suite is now opt-in because it depends on public DNS infrastructure.

Optional live DNS fixtures:
- `RUN_LIVE_DNS_TESTS=1`
- `LIVE_DNS_RESOLVER_PRIMARY`
- `LIVE_DNS_RESOLVER_SECONDARY`
- `LIVE_DNS_DOMAIN`
- `LIVE_DNS_MAIL_DOMAIN`
- `LIVE_DNS_AUTHORITATIVE_DOMAIN`
- `LIVE_DNS_AUTHORITATIVE_NS_IP`

## Beads

This repo uses `bd` for issue tracking:

```bash
bd ready --json
bd show <id>
bd update <id> --claim --json
bd close <id> --reason "Done" --json
```

## Key docs

- `IMPLEMENTATION_BEADS.md`
- `docs/architecture/runtime-topology.md`
- `docs/rules/query-scope.md`
- `docs/rules/trust-boundary.md`
- `STATUS_REPORT.md`