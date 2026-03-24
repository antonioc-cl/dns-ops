# DNS Ops Workbench — Status Report

**Report Date:** 2026-03-24
**Generated at:** 2026-03-24T14:48:00Z

## Executive Summary

Current validation truth:
- `bun run lint` ✅ (8 successful, 8 cached)
- `bun run typecheck` ✅ (14 successful, 14 cached)
- `bun run test` ✅ (1126 passed, 34 skipped — deterministic gate; live DNS opt-in)
- `bun run build` ✅ (8 successful, 7 cached)
- `packages/db: bun run check-drift` ⚠️ (script issue - needs investigation)

## Bead Coverage (per IMPLEMENTATION_BEADS.md)

### Proven (unit + runtime/integration tests)
- **B00** Workspace validation baseline ✅
- **B01** Pilot corpus, vocabulary, query scope ✅
- **B02** Runtime topology ✅
- **B03** Shared contracts and schema ✅
- **B04** DNS collection pipeline 🟡 (live DNS opt-in only)
- **B06** Ruleset registry + persisted findings ✅
- **B07** Snapshot history + diff ✅
- **B09** Mail evidence core 🟡
- **B10** DKIM selector provenance 🟡
- **B11** Mail findings preview 🟡
- **B12** Shadow comparison (DB-backed) ✅
- **B13** Auth, actor, tenant governance ✅

### Code-complete, pending E2E verification
- **B05** Domain 360 viewer (route + API exist, e2e needs DB env)
- **B08** Legacy mail bridge (depends on external URL config)
- **B14** Portfolio search (full API + UI wired)
- **B15** Portfolio writes, notes, tags, overrides, audit (full CRUD)
- **B16** Delegation evidence (collector + API, UI tab hidden per B05 plan)
- **B18** Batch findings report (collector + web proxy)
- **B20** Alerts + shared reports (full lifecycle, webhook delivery implemented)

### Structurally incomplete
- **B17** Non-DNS probe sandbox (feature-flagged, security review complete - PR-06)
- **B19** Job orchestration (requires Redis; scheduler state is in-memory only)

## PR Beads Completed Since Last Report

### PR-01: Domain 360 E2E Proof ✅
- PR-01.1: Differentiate loader error states
- PR-01.2: Render error states distinctly from empty states
- PR-01.3: E2E tests for Domain 360 states

### PR-03: Legacy Bridge Hardening ✅
- PR-03.1: Startup validation for legacy tool URLs
- PR-03.2: Deep-link URL safety and E2E verification

### PR-06: Probe Sandbox Security Review ✅
- PR-06.2: Rate limiting and concurrency enforcement
- PR-06.3: Allowlist integration test
- PR-06.4: Security review documentation

### PR-07: Job Orchestration & DNS Collection Hardening ✅
- PR-07.1: Scheduler state recovery test
- PR-07.2: Document synchronous collection decision
- PR-07.3: Job retry and failure tracking test
- PR-07.4: Graceful shutdown test
- PR-07.5: Fleet report worker integration test

### PR-08: Alert Notification Delivery ✅
- PR-08.1: Webhook notification service on collector
- PR-08.2: Wire notification into alert creation
- PR-08.3: Notification integration tests

### PR-11: Input Validation, Rate Limiting & Collection Safety ✅
- PR-11.1: Validation coverage audit and fixes
  - Migrated POST /api/collect/domain to validateBody()
  - Migrated POST /api/collect/mail to validateBody()
  - Verified notes max length (10k chars)
  - Verified tag format validation

### PR-12: Cleanup & Hygiene ✅
- PR-12.1: Remove stale build artifact from git
- PR-12.2: Fix React array-index key warning
- PR-12.3: De-scope vantagePoints table (migration)
- PR-12.5: Multi-tenant domain uniqueness migration preparation

## Known Limitations (V1)

1. **Job orchestration (B19):** Requires Redis for BullMQ. Without REDIS_URL, queue degrades to synchronous. Scheduler state is process-local (lost on restart).
2. **Multi-tenant domain uniqueness:** Unique index is on `normalizedName` alone. Two tenants cannot own the same domain. Migration prepared in PR-12.5.
3. **Delegation UI (B16):** Collector and API are wired, but the UI tab is intentionally hidden per B05 plan.
4. **Non-DNS probes (B17):** Feature-flagged. Security review complete (PR-06), safe to enable with precautions.

## Test Summary

| Category | Count |
|----------|-------|
| Total Tests | 1,161 |
| Passed | 1,126 |
| Skipped | 34 (Redis/DB required) |
| Failed | 0 |

### Test Files by Area
- Web routes: 35 test files
- Collector: 15 test files
- Rules engine: 4 test files
- Database: 3 test files
- Middleware: 3 test files

## Notes

- All PR beads from recovery context have been addressed
- PR-12.4 (STATUS_REPORT.md regeneration) is the final task
- Use code + command output as source of truth
- Re-run commands for fresh confirmation rather than trusting this file blindly
