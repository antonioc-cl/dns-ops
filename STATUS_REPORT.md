# DNS Ops Workbench — Status Report

**Report Date:** 2026-04-04
**Method:** `bun run lint`, `bun run typecheck`, `bun run test`, `bun run build`, `bun run --filter @dns-ops/web e2e` against current HEAD

## Executive Summary

| Command | Status |
|---------|--------|
| `bun run lint` | ✅ 8/8 packages pass |
| `bun run typecheck` | ✅ 14/14 tasks pass |
| `bun run test` | ✅ 2299 pass, 32 skip, 0 fail (117 test files) |
| `bun run build` | ✅ All packages build |
| `bun run --filter @dns-ops/web e2e` | ✅ 58 pass, 0 fail |
| `bun run --filter @dns-ops/db check-drift` | ✅ No schema drift |
| `bun run --filter @dns-ops/db verify-migrations` | ✅ Pass (vantage_points dropped in migration 0009) |

## Test Status

| Metric | Count |
|--------|-------|
| Unit test files | 117 |
| Passing unit tests | 2299 |
| Skipped unit tests | 32 |
| E2E test files | 5 |
| Passing E2E tests | 58 |

## Shipped UI Surface (Verified by E2E)

- **Homepage:** domain search → navigate to Domain 360
- **Domain 360 Overview:** snapshot metadata, notes, tags, simulation panel
- **Domain 360 DNS tab:** observations in parsed/raw/dig views
- **Domain 360 Mail tab:** persisted mail findings, DKIM selectors, preview badge, live diagnostics
- **Domain 360 Delegation tab:** enabled by default, 6 states rendered (healthy/divergent/lame/missing-glue/DNSSEC/empty)
- **Portfolio:** search, saved filters, monitored domains, alerts, shared reports, fleet reports, template overrides, audit log
- **Refresh:** aria-busy states, auth error handling, re-fetch after success

## Production Readiness Bead Status

### ✅ Done (verified by runtime or test proof)

| PR | Description |
|----|-------------|
| PR-00 | CI E2E gate |
| PR-01 | Domain 360 states (empty/error/loaded) — E2E proven |
| PR-02 | Mail evidence + preview badge + selectors — E2E proven |
| PR-05 | Delegation tab — shipped by default, 6 states E2E proven |
| PR-06 | Probe sandbox security review — IPv4-mapped IPv6 fix, redirect-to-private fix, semaphore, security doc rewritten |
| PR-07 | Job orchestration — scheduler persists repeatables across restart |
| PR-08 | Notifications — full alert→webhook delivery chain wired, SSRF guard, mock-DB integration tests |
| PR-09 | Tenant isolation — test proof, middleware enforcement |
| PR-10 | Observability — ErrorReporter wired, health/detailed endpoint, structured logging, X-Request-ID propagation |
| PR-11 | Input validation & rate limiting |
| PR-12.3 | De-scope vantage_points — migration 0009 drops table, FK, indexes |
| PR-12.5 | Multi-tenant domain uniqueness |

### 🟡 Operational (not blocking ship)

| Item | Description | Status |
|------|-------------|--------|
| Error reporting endpoint | `ERROR_REPORTING_ENDPOINT` env unset | Console fallback works; external service is opt-in |
| Alert real-DB proof | Alert→webhook chain tested with mock DB | Real-DB integration test absent; mock tests prove wiring |
| DNS rebinding (probe) | TOCTOU residual risk documented | Mitigable via `safeLookup` callback; not a blocker while probes are feature-flagged |

## Security Posture

| Area | Status | Notes |
|------|--------|-------|
| Tenant isolation | ✅ | All routes enforce tenant scoping |
| Auth middleware | ✅ | `requireAuth` on all protected routes |
| SSRF protection | ✅ | Shared guard; IPv4-mapped IPv6 + redirect-to-private fixed |
| Private IP blocking | ✅ | RFC1918, loopback, link-local, cloud metadata, IPv4-mapped IPv6 |
| Probe sandbox | ✅ | Security review complete (docs/security/probe-sandbox-review.md v2.0); DNS rebinding residual documented |
| Error reporting | ✅ | Console default; HTTP reporter via `ERROR_REPORTING_ENDPOINT` |
| Structured logging | ✅ | All `console.error`/`console.warn` replaced with structured logger in web + collector |

## Known Limitations

1. Scheduler requires Redis (BullMQ). Without `REDIS_URL`, queue unavailable.
2. Error reporting defaults to console; external integration requires `ERROR_REPORTING_ENDPOINT` env.
3. Lint warnings (not errors) exist in some test files.
4. DNS rebinding TOCTOU is a residual probe risk — documented with specific remediation path.

---

*Generated from actual command output — 2026-04-04 (PR-06 security review + PR-10 observability closure)*
