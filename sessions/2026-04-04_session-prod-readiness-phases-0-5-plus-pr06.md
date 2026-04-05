# Session Closeout — 2026-04-04 — Production Readiness Phases 0–5 + PR-06 Security Review

## 1) TL;DR

- Committed and pushed **all 5 phases** of the production readiness plan (Phases 0–5) plus the **PR-06 probe sandbox security review** and **PR-10.4 structured logging**.
- Two commits: `a6b44a2c` (Phases 0–5, 41 files, +2647/-2127) and `0120df87` (PR-06 + PR-10.4, 12 files, +1227/-190).
- Found and fixed **3 real SSRF vulnerabilities** in the probe sandbox: IPv4-mapped IPv6 bypass, redirect-to-private bypass, and missing concurrency enforcement.
- All verification gates green: lint ✅ typecheck ✅ 2299 tests ✅ build ✅ 58 E2E ✅.
- Produced a remaining-work gap analysis identifying **PR-03, PR-04, PR-11** as the last unaddressed beads.

## 2) Goals vs Outcome

**Planned goals**

- Commit and push all staged production readiness changes
- Delegate remaining PR beads (PR-06, PR-08 completion, PR-10 completion) to parallel agents
- Achieve full production readiness across all beads

**What actually happened**

- Successfully committed and pushed Phase 0–5 changes (from prior session's work)
- Launched 4 agent sessions (2 Codex, 2 Claude Sonnet) — all hit provider rate limits
- PR-06 Sonnet agent completed ~90% of its work before stalling (SSRF fixes, semaphore, security doc, tests)
- PR-08+10 Sonnet agent read files but stalled before making changes
- Took over directly: fixed PR-06 lint issues, implemented PR-10.4 structured logging myself, committed and pushed
- Produced remaining-work gap analysis as final deliverable
- **PR-03, PR-04, and PR-11 remain unaddressed** — these were not part of the original 5-phase plan

## 3) Key decisions (with rationale)

- **Decision:** Take over from stalled agents rather than wait for rate limit reset
  - **Why:** Agents were rate-limited with no ETA < 4 days; work was 90% done
  - **Tradeoff:** Lost the "fresh eyes" second review pass the agents were supposed to do
  - **Status:** confirmed

- **Decision:** Ship delegation tab enabled by default (from prior session, committed here)
  - **Why:** Code has backend + panel + tests + docs expectations; keeping feature-gated preserves permanent truth drift
  - **Tradeoff:** Exposes immature delegation UI states to all users
  - **Status:** confirmed

- **Decision:** Block private/internal webhook targets by default
  - **Why:** Safest V1 posture; no operator allowlist/governance model exists
  - **Tradeoff:** Operators with legitimate internal webhook needs must wait for allowlist feature
  - **Status:** confirmed

- **Decision:** Document DNS rebinding as residual risk rather than fix it
  - **Why:** Full fix requires `safeLookup` callback in Node.js `net.connect`/`tls.connect` — significant effort; probes are feature-flagged so risk is gated
  - **Tradeoff:** TOCTOU window exists if probes are enabled in untrusted-tenant environments
  - **Status:** confirmed

## 4) Work completed (concrete)

### Commit 1: `a6b44a2c` — Production readiness: Phases 0–5 complete
- **Phase 0:** `STATUS_REPORT.md`, `README.md`, `TENANT_ISOLATION.md` regenerated from runtime output
- **Phase 1:** Domain 360 hydration fix (`data-loaded` signal), delegation default-on, dead code removal (`FindingsPanel.tsx`, `LegacyToolsPanel.tsx` — 857 lines), all 58 E2E tests fixed
- **Phase 2:** Worker wired to `generateAndSendFindingAlerts`, unified webhook path, SSRF guard delegation, `canTransitionAlert` allows `pending→sent`, scheduler preserves repeatables
- **Phase 3:** `HttpErrorReporter` + `CompositeErrorReporter` in `@dns-ops/logging`, collector error-tracking uses `createErrorReporter()`
- **Phase 4:** CI starts collector before E2E with health check polling
- **Phase 5:** Migration 0009 drops `vantage_points` table, FK, indexes

### Commit 2: `0120df87` — PR-06 + PR-10.4
- **PR-06.1:** SSRF guard expanded — IPv4-mapped IPv6 extraction (`::ffff:127.0.0.1` → `checkIPv4`), fc00::/7 prefix fix (was `fc00:` only), `ssrf-guard.test.ts` expanded with 78+ new tests
- **PR-06.2:** `Semaphore` class in `apps/collector/src/probes/semaphore.ts`, `initProbeSemaphore()` wired in `probe-routes.ts` from env config
- **PR-06.3:** MTA-STS fetch gets `redirect: 'error'` to block redirect-to-private
- **PR-06.4:** `docs/security/probe-sandbox-review.md` rewritten (v2.0) — honest about gaps found and fixed
- **PR-10.4:** All 8 `console.error`/`console.warn` in `apps/web/hono/config/env.ts` and `apps/web/hono/middleware/db.ts` replaced with structured logger

### Files touched (key files only)
- `apps/collector/src/probes/ssrf-guard.ts` — IPv4-mapped IPv6 extraction, fc00::/7 fix
- `apps/collector/src/probes/semaphore.ts` — **new** — counting semaphore for probe concurrency
- `apps/collector/src/probes/mta-sts.ts` — `redirect: 'error'` added
- `apps/collector/src/jobs/probe-routes.ts` — wired semaphore + env config
- `apps/collector/src/e2e/probe-security.e2e.test.ts` — **new** — 591-line E2E security suite
- `apps/collector/src/notifications/webhook.ts` — unified `sendAlertNotification()`
- `apps/collector/src/jobs/worker.ts` — wired `generateAndSendFindingAlerts`
- `apps/collector/src/middleware/error-tracking.ts` — uses `createErrorReporter()`
- `apps/web/app/routes/domain/$domain.tsx` — hydration fix, delegation tab, mail tab
- `apps/web/hono/routes/api.ts` — `GET /api/health/detailed` endpoint
- `apps/web/hono/config/env.ts` — structured logging
- `apps/web/hono/middleware/db.ts` — structured logging
- `packages/logging/src/error-reporting.ts` — `HttpErrorReporter`, `CompositeErrorReporter`
- `docs/security/probe-sandbox-review.md` — v2.0 security review

## 5) Changes summary (diff-level, not raw)

- **Added:** 15 new files (tests, semaphore, migration, E2E fixtures, security E2E suite)
- **Changed:** 43 existing files across web, collector, db, logging packages
- **Removed:** `FindingsPanel.tsx`, `LegacyToolsPanel.tsx` (orphaned dead code, 857 lines)
- **Behavioral impact:**
  - Delegation tab now visible by default (was feature-gated)
  - Mail tab shows persisted findings/selectors (was manual checker only)
  - Webhook delivery actually sends on alert creation (was create-only)
  - Probe sandbox blocks IPv4-mapped IPv6 SSRF attempts
  - MTA-STS fetch rejects HTTP redirects
  - Error reporting can be routed to external endpoint via `ERROR_REPORTING_ENDPOINT`
  - `console.error`/`console.warn` replaced with structured logger in all non-test source
- **Migration/rollout notes:** Migration 0009 drops `vantage_points` — run `bun run --filter @dns-ops/db check-drift` after deploy

## 6) Open items / Next steps (actionable)

- **Task:** PR-04 — Portfolio E2E Proof (saved filter roundtrip, template overrides, audit log, shared reports, alert dedup)
  - **Owner:** agent
  - **Priority:** P1
  - **Suggested approach:** Read `PRODUCTION_READINESS_BEADS.md` lines 335-410. Write integration tests for each PR-04 subtask. Focus on `apps/web/hono/routes/portfolio.ts`, `apps/web/hono/routes/alerts.ts`, and `packages/db/src/repos/portfolio.ts`.
  - **Blockers/Dependencies:** None — prerequisites (PR-00) are done

- **Task:** PR-11 — Verify validation, rate limiting, and `findOrCreate` race fix are actually implemented
  - **Owner:** agent
  - **Priority:** P1
  - **Suggested approach:** Read `PRODUCTION_READINESS_BEADS.md` PR-11 section. Check `apps/collector/src/middleware/rate-limit.ts`, `apps/web/hono/middleware/validation.ts`, and `packages/db/src/repos/domain.ts` for `findOrCreate`. The status report claims PR-11 is done — verify with evidence.
  - **Blockers/Dependencies:** None

- **Task:** PR-03 — Legacy Mail Bridge Hardening (startup validation + URL safety)
  - **Owner:** agent
  - **Priority:** P2
  - **Suggested approach:** Read `PRODUCTION_READINESS_BEADS.md` lines 282-332. Check `apps/web/hono/routes/legacy-tools.ts` and `apps/web/app/config/legacy-tools.ts`. Add startup validation for `LEGACY_MX_LOOKUP_URL` and `LEGACY_BLACKLIST_CHECK_URL`. Add URL injection safety tests.
  - **Blockers/Dependencies:** None

- **Task:** Investigate 32 skipped tests
  - **Owner:** agent
  - **Priority:** P2
  - **Suggested approach:** `bun run test 2>&1 | grep -i skip` — determine which paths are being skipped and why. If they're skipping real production paths, un-skip or document.
  - **Blockers/Dependencies:** None

- **Task:** README reconciliation pass
  - **Owner:** agent
  - **Priority:** P2
  - **Suggested approach:** Compare `README.md` claims against actual shipped UI and API. Flag overclaims (especially shadow comparison, snapshot history UI).
  - **Blockers/Dependencies:** None

- **Task:** PR-12.4 — Final STATUS_REPORT regeneration
  - **Owner:** agent
  - **Priority:** P2 (must be last)
  - **Suggested approach:** After all other beads complete, rerun all verification commands and regenerate STATUS_REPORT.md from actual output.
  - **Blockers/Dependencies:** All other PR beads must be done first

## 7) Risks & gotchas

- **DNS rebinding TOCTOU (Medium):** The SSRF guard checks hostnames at URL validation time, not at TCP connect time. A DNS rebinding attack could resolve to a public IP first, then a private IP on the actual connection. Documented in `docs/security/probe-sandbox-review.md` with specific remediation (safeLookup callback). Risk is gated by `ENABLE_ACTIVE_PROBES` feature flag.
- **PR-11 claimed done without verification:** STATUS_REPORT says PR-11 (validation, rate limiting, collection safety) is ✅ but this was inherited from a prior session's claim. Needs independent verification.
- **Alert delivery tested with mock DB only:** The `generateAndSendFindingAlerts` → `sendAlertNotification` → `AlertRepository.updateStatus` chain works in mock tests. No real PostgreSQL integration test exists. Unlikely to be a real issue (Drizzle ORM handles the SQL), but worth noting.
- **Agent rate limits:** Both OpenAI Codex and Anthropic Claude Code agent providers hit usage limits during this session. Plan for this when scheduling agent work.

## 8) Testing & verification

**Commands run (all green):**
```
bun run lint          → ✅ 8/8 packages
bun run typecheck     → ✅ 14/14 tasks
bun run test          → ✅ 2299 passed, 32 skipped, 0 failed (117 test files)
bun run build         → ✅
bun run --filter @dns-ops/web e2e  → ✅ 58/58 passed
bun run --filter @dns-ops/db check-drift  → ✅ No drift
bun run --filter @dns-ops/db verify-migrations  → ✅
```

**What was NOT tested:**
- Real-DB integration for alert delivery chain
- Probe sandbox with actual external SMTP/MTA-STS connections (feature-flagged off)
- PR-04 portfolio E2E scenarios (not implemented yet)
- PR-03 legacy bridge startup validation (not implemented yet)
- PR-11 rate limiting under load

**Suggested test plan for next session:**
1. Verify PR-11 claims: check rate-limit middleware exists and is wired, check `findOrCreate` atomicity
2. Write PR-04 integration tests per bead spec
3. Run `bun run test 2>&1 | grep -i skip` and triage 32 skipped tests

## 9) Notes for the next agent

- **If you only read one thing:** Read `PRODUCTION_READINESS_BEADS.md` — it's the single source of truth for what "done" means. Compare each PR bead's "Definition of done" against actual code. The beads still needing work are **PR-03** (legacy bridge), **PR-04** (portfolio proof), and **PR-11** (validation/rate limiting — verify the claim).

- **Where to start:** Run `bun run test` and `bun run --filter @dns-ops/web e2e` to confirm the baseline is still green. Then read PR-04 (lines 335-410 of `PRODUCTION_READINESS_BEADS.md`) — it's the biggest remaining P1.

- **Context that is easy to forget:**
  - `STATUS_REPORT.md` claims PR-11 is done — this claim was NOT independently verified in this session
  - The 32 skipped tests have never been triaged — they could be hiding real gaps
  - `FindingsPanel.tsx` and `LegacyToolsPanel.tsx` were deleted — don't go looking for them
  - The probe semaphore singleton is initialized at module load in `probe-routes.ts` via `initProbeSemaphore(getEnvConfig().probes.concurrency)` — if env config changes, the semaphore must be re-initialized
  - `apps/web/hono/routes/api.ts` already has `GET /api/health/detailed` behind `requireAdminAccess` — don't add it again
  - `X-Request-ID` is already forwarded in `collector-proxy.ts` line 229 — don't add it again
  - Migration 0009 drops `vantage_points` — if you see verify-migrations complain, the migration already handles it
