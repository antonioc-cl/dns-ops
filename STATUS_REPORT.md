# DNS Ops Workbench — Status Report

**Report Date:** 2026-03-31
**Method:** `bun run test`, `bun run lint`, `bun run typecheck` against current HEAD

## Executive Summary

| Command | Status |
|---------|--------|
| `bun run test` | ✅ 2027 pass, 31 skip, 0 fail |
| `bun run lint` | ✅ All packages pass |
| `bun run typecheck` | ✅ All packages pass |
| `bun run build` | ✅ All packages build |

## Test Status

| Metric | Count |
|--------|-------|
| Passing tests | 2027 |
| Skipped tests | 31 |
| Failing tests | 0 |
| Test files | 103 |

**Test Coverage:**
- `packages/db`: 68 tests
- `packages/parsing`: 261 tests
- `packages/rules`: 151 tests
- `apps/collector`: 797 tests
- `apps/web`: 750+ tests

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
| PR-18 | ✅ | Fleet report persistence |

### 🔄 In Progress

| PR | Status | Notes |
|----|--------|-------|
| PR-12 | 🔄 | Multi-tenant domain isolation (bulk write) |
| PR-16 | 🔄 | Delegation evidence |
| PR-17 | 🔄 | Non-DNS probe sandbox |
| PR-20 | 🔄 | Alert notifications |

## Recent Changes (2026-03-31)

### Wave 0 — Build Gate Fixes
- **BLD-001**: Removed unused `_net` import from dnssec-resolver.ts
- **BLD-002**: Committed fleet report persistence (schema + repo + migration)
- **BLD-003**: Fixed duplicate CI YAML artifact block
- **SEC-001**: Added auth middleware to suggestions routes
- **SEC-002**: Atomic upsert for findOrCreate (prevents race conditions)

### Fresh Eyes Bug Fixes
- **BUG-1 (HIGH)**: findOrCreate fallback queries now use `normalizedName` instead of `data.name`
- **BUG-2 (MEDIUM)**: Removed duplicate production code from test file
- **BUG-3 (CRITICAL)**: onConflictDoNothing now targets correct unique constraint `[normalizedName, tenantId]`

### Auth & Testing
- Fixed 3 skipped authz tests in authz-e2e.test.ts
- Added `omitActorId` option to bypass JS default parameter issue
- Removed dead code: SnapshotDiffPanel.tsx

### Database
- FleetReportRepository: Complete persistence pipeline
- Atomic upsert with proper unique constraint targeting

## Security Posture

| Area | Status | Notes |
|------|--------|-------|
| Tenant isolation | ✅ | All routes enforce tenant scoping |
| Auth middleware | ✅ | `requireAuth` on all protected routes |
| SSRF protection | ✅ | Webhook URLs validated with DNS resolution |
| Probe sandbox | ✅ | Feature-flagged, SSRF guards in place |
| Probe allowlist | ✅ | AUTH-003 (tenant-scoped allowlist) complete |
| Suggestions auth | ✅ | requireAuth + requireWritePermission enforced |

## Known Limitations

1. **Job orchestration:** Requires Redis for BullMQ. Without `REDIS_URL`, queue degrades to synchronous.
2. **Alert notifications:** Alert lifecycle tracked, but no actual notification delivery in V1.
3. **Fleet reports:** Persistence complete, webhook notifications pending.

## Pre-existing Issues

The following are known but non-blocking:

1. Some test files have pre-existing lint warnings (noExplicitAny in mocks)
2. SnapshotDiffPanel.tsx removed (was dead code)

---

*Report generated: 2026-03-31*
