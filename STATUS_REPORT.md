# DNS Ops Workbench — Status Report

**Report Date:** 2026-04-05
**Method:** `bun run lint`, `bun run typecheck`, `bun run test`, `bun run build`, `bun run --filter @dns-ops/web e2e` against current HEAD
**Generated at:** 2026-04-06T10:00:00Z

## Executive Summary

| Command | Status |
|---------|--------|
| `bun run lint` | ✅ 8/8 packages pass (0 errors, warnings in test files only) |
| `bun run typecheck` | ✅ 14/14 tasks pass |
| `bun run test` | ✅ 2458 pass, 11 skip, 0 fail (127 test files) |
| `bun run build` | ✅ All packages build |
| `bun run --filter @dns-ops/web e2e` | ✅ 58 pass, 0 fail |
| `bun run --filter @dns-ops/db check-drift` | ✅ No schema drift |
| `bun run --filter @dns-ops/db verify-migrations` | ✅ Pass (vantage_points dropped in migration 0009) |

## Test Status

| Metric | Count |
|--------|-------|
| Unit test files | 127 |
| Passing unit tests | 2458 |
| Skipped unit tests | 11 |
| E2E test files | 5 |
| Passing E2E tests | 58 |

### Skipped Tests Breakdown

| File | Count | Reason |
|------|-------|--------|
| `queue.test.ts` | 0 | Deferred Redis tests removed (documented, not stubs) |
| `scheduler.test.ts` | 5 | `skipIf(!hasRedis)` — BullMQ scheduler recovery |
| `dns/integration.test.ts` | 2 | `RUN_LIVE_DNS_TESTS` flag — live network tests |
| `dns/integration.test.ts` | 2 | Authoritative live DNS — requires specific NS config |
| `collector/e2e/*.test.ts` | 2 | Redis-dependent e2e tests |

Note: 13 empty Redis-gated test stubs were removed and replaced with a documentation
block listing what would be tested when Redis is available.

All skips are infrastructure-gated and intentional. Redis tests are optional — see "Redis Scope" below.

## Shipped UI Surface (Verified by E2E)

- **Homepage:** domain search → navigate to Domain 360
- **Domain 360 Overview:** snapshot metadata, notes, tags, simulation panel
- **Domain 360 DNS tab:** observations in parsed/raw/dig views
- **Domain 360 Mail tab:** persisted mail findings, DKIM selectors, preview badge, live diagnostics
- **Domain 360 Delegation tab:** enabled by default, 6 states rendered (healthy/divergent/lame/missing-glue/DNSSEC/empty)
- **Domain 360 History tab:** snapshot list, compare-latest, manual snapshot-to-snapshot diff
- **Portfolio:** search, saved filters, monitored domains, alerts, shared reports, fleet reports, template overrides, audit log
- **Refresh:** aria-busy states, auth error handling, re-fetch after success

## Implementation Bead Status

### All 21 Beads — ✅ Complete

| Bead | Name | Status |
|------|------|--------|
| 00 | Workspace validation baseline | ✅ |
| 01 | Pilot corpus, status vocabulary, query scope, trust boundary | ✅ |
| 02 | Authoritative runtime topology and scaffold | ✅ |
| 03 | Shared contracts and core supported schema | ✅ |
| 04 | DNS collection and normalization pipeline | ✅ |
| 05 | Single-domain evidence viewer | ✅ |
| 06 | Ruleset registry and persisted DNS findings | ✅ |
| 07 | Snapshot history and diff | ✅ |
| 08 | Legacy mail bridge | ✅ |
| 09 | Mail evidence core | ✅ |
| 10 | DKIM selector provenance and provider detection | ✅ |
| 11 | Mail findings preview | ✅ |
| 12 | Shadow comparison and parity evidence | ✅ |
| 13 | Auth, actor, tenant, and write-path governance | ✅ |
| 14 | Portfolio search and read models | ✅ |
| 15 | Portfolio writes, notes, tags, overrides, adjudication, audit log | ✅ |
| 16 | Delegation evidence | ✅ |
| 17 | Non-DNS probe sandbox (optional, feature-flagged) | ✅ |
| 18 | Batch findings report | ✅ |
| 19 | Job orchestration and scheduled refresh | ✅ |
| 20 | Alerts and shared reports | ✅ |

## Production Readiness Bead Status

### All 13 PR Beads — ✅ Done

| PR | Description | Status |
|----|-------------|--------|
| PR-00 | CI E2E gate | ✅ |
| PR-01 | Domain 360 end-to-end proof | ✅ |
| PR-02 | Mail evidence chain proof | ✅ |
| PR-03 | Legacy mail bridge hardening (URL safety, startup validation) | ✅ |
| PR-04 | Portfolio end-to-end proof (filter round-trip, audit log, shared reports, dedup) | ✅ |
| PR-05 | Delegation UI activation | ✅ |
| PR-06 | Probe sandbox security review | ✅ |
| PR-07 | Job orchestration & DNS collection hardening | ✅ |
| PR-08 | Alert notification delivery (webhook + SSRF guard) | ✅ |
| PR-09 | Tenant isolation proof | ✅ |
| PR-10 | Observability and operational readiness | ✅ |
| PR-11 | Input validation, rate limiting, and collection safety | ✅ |
| PR-12 | Cleanup and hygiene | ✅ |

## Security Posture

| Area | Status | Notes |
|------|--------|-------|
| Tenant isolation | ✅ | All routes enforce tenant scoping; cross-tenant tests prove isolation |
| Auth middleware | ✅ | `requireAuth` on all protected routes; 3 auth strategies (CF Access, API key, dev bypass) |
| SSRF protection | ✅ | Shared guard; IPv4-mapped IPv6 + redirect-to-private + DNS rebinding pre-resolution fixed |
| Private IP blocking | ✅ | RFC1918, loopback, link-local, cloud metadata, IPv4-mapped IPv6 |
| Probe sandbox | ✅ | Security review complete (docs/security/probe-sandbox-review.md v2.0); DNS rebinding residual documented |
| Input validation | ✅ | All mutating routes use `validateBody()` with field validators |
| Rate limiting | ✅ | Collector: token-bucket at 10 req/min (collect) and 5 req/min (probes); proven by test |
| Collection dedup | ✅ | 60-second window prevents rapid re-collection |
| Domain findOrCreate | ✅ | Atomic upsert via `INSERT ... ON CONFLICT DO NOTHING` |
| Error reporting | ✅ | Console default; HTTP reporter via `ERROR_REPORTING_ENDPOINT` |
| Structured logging | ✅ | All `console.error`/`console.warn` replaced with structured logger |

## Redis Scope

Redis (BullMQ) is **optional infrastructure**, not a production requirement.

| Feature | Without Redis | With Redis |
|---------|--------------|------------|
| Single-domain collection | ✅ Synchronous (primary model) | Unchanged |
| Mail collection | ✅ Synchronous | Unchanged |
| All CRUD operations | ✅ Work normally | Unchanged |
| Monitoring refresh | Manual trigger only | Scheduled (cron) |
| Fleet reports | Synchronous | Async queue |
| Job retry | No automatic retry | 3x with exponential backoff |

The V1 architecture is synchronous by design. Redis adds scheduling and retry for future scaling. See `docs/REDIS_FALLBACK.md` for full documentation.

## Known Limitations

1. DNS rebinding TOCTOU is mitigated via `resolveAndCheck()` in ssrf-guard.ts. Hostnames are pre-resolved
   and the resolved IP is checked against the SSRF blocklist before `fetch()`. DNS resolution failures are
   allowed through (non-resolvable hosts will fail at fetch naturally, not a rebinding vector).
2. Redis-dependent tests (5 of 11 skips) only run with `RUN_REDIS_INTEGRATION_TESTS=1`.
3. Live DNS integration tests require `RUN_LIVE_DNS_TESTS=1`.
4. Scheduler state (`activeSchedules` Map) is process-local; BullMQ repeatable jobs survive in Redis but observability Map resets on restart.

## Ship Decision

| Ship Unit | Decision |
|-----------|----------|
| `apps/web` (Cloudflare Workers) | **GO** |
| `apps/collector` (Node.js) | **GO** |

---

*Generated from actual command output — 2026-04-05 (all PROD tasks complete)*
