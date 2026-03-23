# DNS Ops Workbench — Status Report

**Report Date:** 2026-03-23
**Method:** direct command execution against current repo state

## Executive summary

Current validation truth:
- `bun run lint` ✅
- `bun run typecheck` ✅
- `bun run test` ✅ (815 passed, 6 skipped — deterministic gate; live DNS opt-in)
- `bun run build` ✅
- `packages/db: bun run check-drift` ✅
- E2E: requires DATABASE_URL in playwright env (fixed in this batch)

## Bead coverage (per IMPLEMENTATION_BEADS.md)

Code exists touching all 21 beads (00–20). However, coverage is not uniform:

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
- **B20** Alerts + shared reports (full lifecycle, no notification delivery)

### Structurally incomplete
- **B17** Non-DNS probe sandbox (feature-flagged, needs security review)
- **B19** Job orchestration (requires Redis; scheduler state is in-memory only)

## What was fixed in this batch (2026-03-23)

- Added circuit breaker to collector proxy (3-failure threshold, 30s cooldown, clear 503 responses)
- Migrated all proxy consumers (fleet-report, collection trigger) to proxyToCollector() helper
- Fixed playwright config: added DATABASE_URL, NODE_ENV, COLLECTOR_URL to webServer env
- Fixed selector suggestion route: replaced self-referencing fetch with direct repo calls (was broken on Workers)
- Removed dead in-memory ShadowComparisonStore from rules package (DB-backed repo is authoritative)
- Clarified InMemoryTemplateStorage as read-only cache (DB-backed ProviderBaselineRepository for durable writes)
- Hardened dev bypass auth: explicit NODE_ENV === 'development' check (rejects if unset)
- Added auth failure logging to web requireAuthMiddleware
- Removed committed build artifact (app.config.timestamp_*.js)
- Added app.config.timestamp_*.js to .gitignore
- Marked vantagePoints table as de-scoped in schema
- Reconciled this status report with IMPLEMENTATION_BEADS.md

## Known limitations (V1)

1. **Job orchestration (B19):** Requires Redis for BullMQ. Without REDIS_URL, queue degrades to synchronous. Scheduler state is process-local (lost on restart).
2. **Alert notifications (B20):** Alert lifecycle is tracked (create → ack → resolve), but no actual notification delivery (email/webhook) exists. Alerts are dashboard-only for V1.
3. **Multi-tenant domain uniqueness:** Unique index is on `normalizedName` alone. Two tenants cannot own the same domain.
4. **Delegation UI (B16):** Collector and API are wired, but the UI tab is intentionally hidden per B05 plan.
5. **Non-DNS probes (B17):** Feature-flagged. SSRF guards and allowlist exist but need formal security review before enabling.

## Notes

Use code + command output as source of truth. Re-run commands for fresh confirmation rather than trusting this file blindly.
