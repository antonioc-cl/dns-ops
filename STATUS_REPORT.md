# DNS Ops Workbench — Status Report

**Report Date:** 2026-03-22
**Method:** direct command execution against current repo state

## Executive summary

Current validation truth:
- `bun run lint` ✅
- `bun run typecheck` ✅
- `bun run test` ✅ (deterministic default gate; live DNS smoke excluded unless opted in)
- `bun run build` ✅
- `packages/db: bun run check-drift` ✅
- `packages/db: DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres bun run verify-migrations` ✅
- `E2E_DEV_TENANT=test-tenant E2E_DEV_ACTOR=test-actor bun run --filter @dns-ops/web e2e` ✅ (`8 passed`)

This repo is back to green on the verified local command set above.

## Fixed in the latest batch

- Collector DNS integration tests are now opt-in instead of running in the default repo gate
- Added root and collector `test:live-dns` scripts for intentional real-network smoke
- Reduced live DNS assertions to stable smoke checks with explicit fixtures and longer timeouts
- CI now forces `RUN_LIVE_DNS_TESTS=0` for the default `Test` step
- Reopened `/portfolio` further with monitored-domain management, alert triage, fleet-report, template-override, audit-log, and saved-filter-backed search panels
- Added same-origin web fleet-report proxy coverage and tenant tag-suggestions backend glue
- Added tenant-safe domain-context lookup so Domain 360 notes/tags no longer depend on snapshots existing first
- Added route-owned portfolio filter state plus real saved-filter load/save/share wiring
- Added persisted audit coverage for monitoring mutations and alert lifecycle transitions
- Added direct Domain 360 links from monitoring and alert cards plus shared-report expire controls
- Extended web smoke to verify Domain 360 operator context plus portfolio search/saved-filters/monitoring/alerts/shared-reports/governance reachability

## Current product truth

- Collector health/auth/db lifecycle is fixed and validated
- Default repo validation no longer depends on public DNS reachability
- Live DNS integration coverage remains available through the opt-in `test:live-dns` path
- Web write paths fail closed and carry tenant/actor context
- Remediation requests are now repo-backed and tenant-scoped
- Shared reports are now persisted, redacted, shareable by token, reachable from `/portfolio`, and expirable from the UI
- Monitoring, alert-state, remediation, and shared-report mutations now emit persisted tenant audit events
- `/portfolio` now exposes portfolio search, saved filters, monitored domains, alerts, fleet reports, shared reports, template overrides, and the tenant audit log
- Domain 360 now exposes `Overview`, `DNS`, and `Mail`, with tenant-scoped notes and tags on `Overview`

## Still pending

### Runtime
- Finalize the Workers runtime contract if true Hyperdrive binding support is required beyond the current env-string path

## Notes

Use code + command output as source of truth. Re-run commands for fresh confirmation rather than trusting this file blindly.
