# DNS Ops Workbench — Verified Status Report

**Report Date:** 2026-03-20  
**Verification Method:** Command-backed status (actual command execution)

## Build Status

| Command | Status | Notes |
|---------|--------|-------|
| `bun run build` | ✅ PASS | All 7 packages build successfully |
| `bun run typecheck` | ✅ PASS | All packages type-check |
| `bun run lint` | ⚠️ PARTIAL | Biome lint has minor issues (non-null assertions) |
| `bun run test` | ⚠️ PARTIAL | Runs build, not actual tests (see Test Status) |

### Build Details
```
Packages:
- @dns-ops/contracts ✅
- @dns-ops/db ✅
- @dns-ops/parsing ✅
- @dns-ops/rules ✅
- @dns-ops/testkit ✅
- @dns-ops/collector ✅
- @dns-ops/web ✅
```

## Test Status

| Package | Test Files | Test Script | Status |
|---------|------------|-------------|--------|
| @dns-ops/rules | 2 test files (.test.ts) | ❌ Missing | No test runner configured |
| @dns-ops/collector | 3 test files (.test.ts) | ❌ Missing | No test runner configured |
| Other packages | None | N/A | No tests |

**Issue:** Test files exist but `package.json` scripts lack test configuration. The root `bun run test` executes `turbo run test` which falls back to build.

## Lint Status

Minor Biome lint issues in rules package:
- `src/dns/rules.ts:410:5` - non-null assertion
- `src/mail/rules.ts:265:30` - non-null assertion

These are style warnings, not errors.

## Bead Implementation Status

**Source of Truth:** `IMPLEMENTATION_BEADS.md` (revised 2026-03-20)

**Important:** The revised bead execution order supersedes any previous claims. The beads/ directory contains regenerated files aligned with the revised plan.

### Revised Bead Order (Authoritative)

| Bead | Title | Status |
|------|-------|--------|
| 00 | Workspace validation baseline | 🔄 In Progress |
| 01 | Pilot corpus, status vocabulary, query scope, trust boundary | ⏳ Pending |
| 02 | Authoritative runtime topology and scaffold | ⏳ Pending |
| 03 | Shared contracts and core supported schema | ⏳ Pending |
| 04 | DNS collection and normalization pipeline | ⏳ Pending |
| 05 | Single-domain evidence viewer | ⏳ Pending |
| 06 | Ruleset registry and persisted DNS findings | ⏳ Pending |
| 07 | Snapshot history and diff | ⏳ Pending |
| 08 | Legacy mail bridge | ⏳ Pending |
| 09 | Mail evidence core | ⏳ Pending |
| 10 | DKIM selector provenance and provider detection | ⏳ Pending |
| 11 | Mail findings preview | ⏳ Pending |
| 12 | Shadow comparison and parity evidence | ⏳ Pending |
| 13 | Auth, actor, tenant, and write-path governance | ⏳ Pending |
| 14 | Portfolio search and read models | ⏳ Pending |
| 15 | Portfolio writes, notes, tags, overrides, adjudication, audit log | ⏳ Pending |
| 16 | Delegation evidence | ⏳ Pending |
| 17 | Non-DNS probe sandbox (optional) | ⏳ Pending |
| 18 | Batch findings report | ⏳ Pending |
| 19 | Job orchestration and scheduled refresh | ⏳ Pending |
| 20 | Alerts and shared reports | ⏳ Pending |

### Audit Closure Beads (Active Work)

| Bead ID | Title | Assignee | Status |
|---------|-------|----------|--------|
| dns-ops-2dy.1 | 00 — Workspace validation baseline | dns-ops-cc-1 | 🔄 In Progress |
| dns-ops-1j4.1.1 | Agregar @biomejs/biome y dejar pnpm lint en verde | dns-ops-cc-2 | 🔄 In Progress |
| dns-ops-1j4.1.2 | Agregar scripts test reales por workspace | Unassigned | ⏳ Open |
| dns-ops-1j4.1.5 | Reescribir STATUS_REPORT.md | dns-ops-pi-1 | 🔄 In Progress |

## Frozen Ahead-of-Plan Surfaces

The following code exists but is **not** evidence of completed beads:

- `apps/web/hono/routes/mail.ts`
- `apps/web/hono/routes/portfolio.ts`
- `apps/web/hono/routes/shadow-comparison.ts`
- `apps/web/hono/routes/provider-templates.ts`
- `apps/collector/src/jobs/fleet-report.ts`
- `apps/collector/src/jobs/monitoring.ts`
- `apps/collector/src/jobs/probe-routes.ts`
- `apps/web/app/routes/domain/$domain.tsx`
- `apps/web/app/components/mail/MailDiagnostics.tsx`
- `apps/web/app/components/mail/RemediationForm.tsx`
- `apps/web/app/components/DiscoveredSelectors.tsx`
- `apps/web/app/components/DelegationPanel.tsx`
- `apps/collector/src/index.ts`

These surfaces are frozen/experimental until their owning beads land.

## Known Issues

1. **Test Infrastructure:** Test files exist but no test runner is configured
2. **Lint Warnings:** Minor non-null assertion warnings in rules package
3. **Documentation Drift:** Previous STATUS_REPORT claimed "ALL BEADS COMPLETE" which was inaccurate

## Verification Commands

To verify this report:

```bash
# Build
bun run build

# Type check
bun run typecheck

# Lint
bun run lint

# Test (currently runs build)
bun run test
```

## Next Steps

1. Complete workspace validation (bead 00)
2. Add test runner configuration to packages
3. Execute revised bead plan starting from bead 01

---

**Note:** This report reflects actual command execution results, not aspirational status. For the authoritative bead plan, see `IMPLEMENTATION_BEADS.md`.
