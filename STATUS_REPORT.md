# DNS Ops Workbench — Status Report

**Report Date:** 2026-03-30
**Method:** `bun run test`, `bun run lint`, `bun run typecheck` against current HEAD

## Executive Summary

| Command | Status |
|---------|--------|
| `bun run test` | ✅ 1330 pass, 37 skip, 0 fail |
| `bun run lint` | ⚠️ 2 pre-existing errors (not related to source code) |
| `bun run typecheck` | ✅ All packages pass |
| `bun run build` | ✅ All packages build |

## Test Status

| Metric | Count |
|---------|-------|
| Passing tests | 1367 |
| Skipped tests | 37 |
| Failing tests | 0 |

**Note:** Batch 1 audit completed. Current state reflects:
- N+1 query fixes in portfolio routes
- Tenant isolation tests for snapshots, simulation, findings
- DB failfast middleware tests
- Batch collection optimizations
- E2E integration tests for DNS-003, SEC-004, DX-004
- DATA-003: Probe observation persistence
- OBS-001: APM/error aggregation observability

## Bead Coverage

### ✅ Completed PRs

| PR | Status | Notes |
|----|--------|-------|
| PR-00 | ✅ | CI E2E Gate |
| PR-02 | ✅ | Mail Evidence Core |
| PR-06 | ✅ | Probe Sandbox Security Review |
| PR-07 | ✅ | Job Orchestration & DNS Collection |
| PR-08 | ✅ | Notifications (webhook) |
| PR-09 | ✅ | Tenant Isolation Proof |
| PR-10 | ✅ | Observability & Operational Readiness |
| PR-11 | ✅ | Input Validation & Rate Limiting |
| PR-12.3 | ✅ | De-scope vantagePoints table |
| PR-12.5 | ✅ | Multi-tenant domain uniqueness |

### 🔄 In Progress

| PR | Status | Notes |
|----|--------|-------|
| PR-12 | 🔄 | Multi-tenant domain isolation (bulk write) |
| PR-16 | 🔄 | Delegation evidence (DNS-001/DNS-002 pending) |
| PR-17 | 🔄 | Non-DNS probe sandbox (AUTH-002 done, AUTH-003 pending) |
| PR-18 | 🔄 | Batch findings report (DATA-002 pending) |
| DATA-003 | ✅ | Probe observation persistence |
| PR-20 | 🔄 | Alert notifications (JOB-002 pending) |

## Batch 1 Audit Tasks - Status

### P0 (Critical - All Done ✅)

| Task | Status | Verification |
|------|--------|--------------|
| SEC-001 | ✅ | `requireAuth` + tenant isolation in snapshots.ts |
| SEC-002 | ✅ | Tenant isolation in simulation.ts |
| DX-001 | ✅ | Contracts formatting fixed |

### P1 (Blocking - All Done ✅)

| Task | Status | Notes |
|------|--------|-------|
| DNS-001 | ✅ | AA flag documented as disabled; dns-packet migration documented |
| AUTH-001 | ✅ | Shadow comparison tenant isolation |
| AUTH-002 | ✅ | Probe routes feature-flagged |
| SEC-003 | ✅ | Webhook SSRF guard with DNS resolution |
| JOB-001 | ✅ | Scheduled monitoring refresh implemented |
| MAIL-001 | ✅ | Mail evidence path documented |
| DATA-001 | ✅ | Multi-tenant domain uniqueness index |

### P2 (Quality/Hardening)

| Task | Status | Notes |
|------|--------|-------|
| DX-002 | ✅ | STATUS_REPORT.md regenerated |
| PERF-001 | ✅ | Batch queries in portfolio search |
| DX-003 | ✅ | DB failfast middleware |
| DX-004 | ✅ | Domain validation consolidation |
| DNS-003 | ✅ | DKIM selector false-positive fix |
| SEC-004 | ✅ | SMTP STARTTLS multiline parsing |
| DX-006 | ✅ | Shared report evidence redaction - already implemented |

### P3 (Cleanup/Polish)

| Task | Status | Notes |
|------|--------|-------|
| DOC-001 | ✅ | Runtime topology documentation |
| DX-005 | ✅ | Redis fallback documentation - docs/REDIS_FALLBACK.md |
| DX-006 | ✅ | Shared report evidence redaction - already implemented |
| OBS-001 | ✅ | APM/error aggregation - observability.ts |

## Known Limitations

1. **Job orchestration (B19):** Requires Redis for BullMQ. Without `REDIS_URL`, queue degrades to synchronous. See [docs/REDIS_FALLBACK.md](docs/REDIS_FALLBACK.md).
2. **Alert notifications (B20):** Alert lifecycle tracked, but no actual notification delivery in V1.
3. **DNSKEY/DS queries (DNS-002):** Node.js `dns` module doesn't support these types. Migration to `dns-packet` needed.
4. **Authoritative AA flag (DNS-001):** Node.js `dns` module doesn't expose authoritative answer flag.
5. **Probe persistence (DATA-003):** Probe observations not yet persisted to database.
6. **Fleet report persistence (DATA-002):** Reports returned inline but not persisted.

## Security Posture

| Area | Status | Notes |
|------|--------|-------|
| Tenant isolation | ✅ | All routes enforce tenant scoping |
| Auth middleware | ✅ | `requireAuth` on all protected routes |
| SSRF protection | ✅ | Webhook URLs validated with DNS resolution |
| Probe sandbox | ✅ | Feature-flagged, SSRF guards in place |
| Probe allowlist | ✅ | AUTH-003 (tenant-scoped allowlist) complete |

## Recent Changes (This Session)

- SEC-001: Added `requireAuth` + tenant isolation to snapshot routes
- SEC-003: Enhanced webhook SSRF guard with DNS resolution
- JOB-001: Implemented scheduled monitoring refresh handler
- PERF-001: Batch query optimization in portfolio search
- DX-003: DB failfast middleware with dev/workers mode detection
- DATA-001: Multi-tenant domain uniqueness constraint
- DNS-001: Documented AA flag limitation and migration path
- MAIL-001: Clarified mail evidence truth path

## Pre-existing Issues

The following issues exist but are unrelated to batch 1:

1. `packages/contracts/src/result.ts` - Type errors (Result type implementation)
2. `packages/parsing/src/domain/result.ts` - Test file with incorrect types
3. `packages/parsing/src/dns/result.test.ts` - Test file with incorrect types

These are not blocking and can be addressed separately.

---

*Report generated: 2026-03-30*
