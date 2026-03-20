# DNS Ops Workbench — Verified Status Report

**Report Date:** 2026-03-20
**Verification Method:** Command execution and test results

## Executive Summary

The project is in active development with foundational work in progress. Several audit closure tasks are being addressed to establish a truthful baseline before proceeding with feature implementation.

## Build & Validation Status

| Command | Status | Last Verified | Notes |
|---------|--------|---------------|-------|
| `bun run build` | ✅ PASS | 2026-03-20 | All workspaces build successfully |
| `bun run typecheck` | ✅ PASS | 2026-03-20 | TypeScript compilation succeeds |
| `bun run lint` | ⚠️ PARTIAL | 2026-03-20 | Minor Biome warnings (non-null assertions) |
| `bun run test` | ⚠️ FAILING | 2026-03-20 | 10 tests failing, 131 passing |

### Test Results Summary

```
Total: 141 tests
Passed: 131
Failed: 10
Errors: 3
```

**Failing Tests:**
- DelegationCollector: 2 failures (per-authoritative-server collection)
- Recursive vs Authoritative Mismatch Rule: 1 failure
- SPF Rules: 4 failures (duplicate test execution issue resolved)
- Mail checker tests: 3 errors (vi.mocked/vi.hoisted compatibility)

**Note:** Test artifact exclusion (dns-ops-1j4.1.3) has been resolved. Tests now run only from source files.

## Bead Implementation Status

**Source of Truth:** `IMPLEMENTATION_BEADS.md` (revised 2026-03-20)

### Revised Bead Execution (Beads 00-20)

| Bead | Title | Status | Assignee |
|------|-------|--------|----------|
| 00 | Workspace validation baseline | ⏳ Open | - |
| 01 | Pilot corpus, status vocabulary, query scope, trust boundary | ⏳ Open | - |
| 02 | Authoritative runtime topology and scaffold | ✅ Closed | - |
| 03 | Shared contracts and core supported schema | 🔄 In Progress | AzureBear |
| 04 | DNS collection and normalization pipeline | ⏳ Open | - |
| 05 | Single-domain evidence viewer | ⏳ Open | - |
| 06 | Ruleset registry and persisted DNS findings | ⏳ Open | - |
| 07 | Snapshot history and diff | ⏳ Open | - |
| 08 | Legacy mail bridge | ⏳ Open | - |
| 09 | Mail evidence core | ⏳ Open | - |
| 10 | DKIM selector provenance and provider detection | ⏳ Open | - |
| 11 | Mail findings preview | ⏳ Open | - |
| 12 | Shadow comparison and parity evidence | ⏳ Open | - |
| 13 | Auth, actor, tenant, and write-path governance | ⏳ Open | - |
| 14 | Portfolio search and read models | ⏳ Open | - |
| 15 | Portfolio writes, notes, tags, overrides, adjudication, audit log | ⏳ Open | - |
| 16 | Delegation evidence | ⏳ Open | - |
| 17 | Non-DNS probe sandbox (optional) | ⏳ Open | - |
| 18 | Batch findings report | ⏳ Open | - |
| 19 | Job orchestration and scheduled refresh | ⏳ Open | - |
| 20 | Alerts and shared reports | ⏳ Open | - |

### Active Audit Closure Work

High-priority tasks to establish baseline truth:

| Task ID | Description | Status | Assignee |
|---------|-------------|--------|----------|
| dns-ops-1j4.1.3 | Exclude dist artifacts from tests | ✅ Closed | dns-ops-pi-4 |
| dns-ops-1j4.1.4 | Fix failing source tests | 🔄 In Progress | dns-ops-cc-2 |
| dns-ops-1j4.1.5 | Rewrite STATUS_REPORT.md | 🔄 In Progress | dns-ops-pi-4 |
| dns-ops-1j4.1.6 | Fix README bead references | ⏳ Open | - |
| dns-ops-1j4.1.7 | Align query-scope.md with actual behavior | ⏳ Open | - |

**Security & Runtime (Priority 0):**
- Auth middleware implementation (dns-ops-1j4.3.1, dns-ops-1j4.3.2)
- Tenant isolation fixes (dns-ops-1j4.3.3, dns-ops-1j4.3.4)
- TLS security review (dns-ops-1j4.3.8)
- DB middleware for collector (dns-ops-1j4.2.4)

## Frozen Ahead-of-Plan Surfaces

The following code exists but is **not production-ready** and should not be used as evidence of completed work:

### Routes
- `apps/web/hono/routes/mail.ts`
- `apps/web/hono/routes/portfolio.ts`
- `apps/web/hono/routes/shadow-comparison.ts`
- `apps/web/hono/routes/provider-templates.ts`

### Jobs
- `apps/collector/src/jobs/fleet-report.ts`
- `apps/collector/src/jobs/monitoring.ts`
- `apps/collector/src/jobs/probe-routes.ts`

### Components
- `apps/web/app/routes/domain/$domain.tsx`
- `apps/web/app/components/mail/MailDiagnostics.tsx`
- `apps/web/app/components/mail/RemediationForm.tsx`
- `apps/web/app/components/DiscoveredSelectors.tsx`
- `apps/web/app/components/DelegationPanel.tsx`

These surfaces remain frozen until their owning beads (08-20) are completed.

## Known Issues

### Critical (Priority 0)
1. **Auth Missing:** No authentication middleware on web or collector routes
2. **Tenant Isolation:** Silent defaults for tenantId/actorId instead of explicit failures
3. **Insecure TLS:** Database connection disables certificate verification in production
4. **Test Failures:** 10 failing tests block workspace validation (bead 00)

### High Priority (Priority 1)
1. **Env Validation:** No startup validation for required environment variables
2. **DB Context:** Collector routes assume DB context without wiring
3. **Fake Endpoints:** `/api/collect/status/:snapshotId` always returns completed
4. **Runtime Mismatch:** Web uses PG-only adapter in Cloudflare Pages runtime

### Medium Priority
1. **Lint Warnings:** Non-null assertion warnings in rules package
2. **Vitest Compatibility:** Tests use vi.mocked/vi.hoisted which require configuration

## Verification Commands

```bash
# Build all workspaces
bun run build

# Type check
bun run typecheck

# Lint
bun run lint

# Run tests (source only, excludes dist)
bun run test

# Check bead status
br ready
br list --status open --status in_progress
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Monorepo Structure                                          │
├─────────────────────────────────────────────────────────────┤
│  apps/                                                       │
│    ├─ web/          TanStack Start + Hono (Cloudflare)      │
│    └─ collector/    Node.js DNS/mail collection service     │
│  packages/                                                   │
│    ├─ contracts/    Shared TypeScript contracts & DTOs      │
│    ├─ db/           Drizzle ORM + Postgres schema           │
│    ├─ parsing/      DNS/mail parsing utilities              │
│    ├─ rules/        Deterministic evaluation engine         │
│    └─ testkit/      Test fixtures and benchmark corpus      │
└─────────────────────────────────────────────────────────────┘
```

## Next Steps

1. **Immediate:** Complete audit closure tasks (priority 0)
2. **Short-term:** Finish Bead 03 (Shared contracts)
3. **Medium-term:** Implement Bead 04-05 (DNS collection + viewer)
4. **Verification:** Ensure all tests pass before declaring bead 00 complete

---

**Important:** This report reflects actual command execution results. For the authoritative implementation plan, see `IMPLEMENTATION_BEADS.md`.

For bead tracking, use `br` commands. Do not rely on this document for granular task status.
