# Remaining Production Readiness — Implementation Plan

**Created:** 2026-04-05
**Status:** Plan only — no implementation
**Scope:** PR-03, PR-04, PR-11 + high-risk warning verification

---

## Executive Summary

Three PR beads remain before unconditional GO:
- **PR-11** — partially done, NOT falsely claimed (rate limiting + findOrCreate race fix are implemented and wired)
- **PR-04** — not started (portfolio E2E proof requires integration tests against real Postgres)
- **PR-03** — not started (legacy bridge hardening, small scope)

**PR-11 is NOT a false claim.** Verification below proves it.

---

## HIGH-RISK WARNING RESOLUTION: PR-11 Verification

### PR-11.2 Rate Limiting — ✅ VERIFIED DONE

**Evidence:**
- `apps/collector/src/middleware/rate-limit.ts` (259 lines) — full token-bucket implementation with `rateLimitMiddleware('collect')` and `rateLimitMiddleware('probes')` scopes
- **Wired in `apps/collector/src/index.ts` lines 116-117:**
  ```typescript
  app.use('/api/collect/*', rateLimitMiddleware('collect'));
  app.use('/api/probe/*', rateLimitMiddleware('probes'));
  ```
- Returns 429 with `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers
- Test file exists: `apps/collector/src/middleware/rate-limit.test.ts`
- Limits: 10 req/min for collect, 5 req/min for probes

### PR-11.3 findOrCreate Race Fix — ✅ VERIFIED DONE

**Evidence:**
- `packages/db/src/repos/domain.ts` lines 140-191 — uses `INSERT ... ON CONFLICT DO NOTHING` via Drizzle's `onConflictDoNothing({ target: [domains.normalizedName, domains.tenantId] })` + `returning()`
- Falls back to `findByNameAndTenant()` on conflict — atomic upsert pattern
- Comprehensive test file: `packages/db/src/repos/domain.find-or-create.test.ts` (353 lines) covering:
  - Concurrent calls for same domain
  - Conflict resolution fallback
  - Multi-tenant scenarios
  - Global (no-tenant) domain scenarios

### PR-11.1 Validation Coverage — ⚠️ PARTIALLY VERIFIED

**What's done:**
- `apps/web/hono/middleware/validation.ts` has comprehensive validators (3119 tokens)
- Portfolio, alerts, monitoring, simulation routes all use `validateBody()`
- `POST /api/collect/domain` in `apps/web/hono/routes/api.ts` uses `validateBody` with `domainName()` and `enumValue()` validators

**What needs verification:**
- [ ] `POST /api/collect/mail` validation coverage
- [ ] `POST /api/portfolio/notes` content max length (10,000 chars)
- [ ] `POST /api/portfolio/tags` tag format/length validation at API layer
- [ ] Collection dedup check (60-second window) — no evidence this was implemented

### PR-11 Verdict

**STATUS_REPORT claim is ~85% accurate.** Rate limiting and findOrCreate are done. Validation coverage and collection dedup need verification/completion.

---

## Phase 1: PR-11 Completion (Small gaps)

**Priority:** P1
**Effort:** Small (2-3 hours)
**Dependencies:** None

### Task 1.1: Verify remaining validation gaps

**Files to check:**
- `apps/collector/src/jobs/collect-mail.ts` — does it validate `domain`, `preferredProvider`, `explicitSelectors`?
- `apps/web/hono/routes/portfolio.ts` — find `POST /api/portfolio/notes` and check for `content` max length
- `apps/web/hono/routes/portfolio.ts` — find `POST /api/portfolio/tags` and check for tag format validation

**Action:** Read each route, verify validators exist. If missing, add them using existing `validateBody()` pattern.

### Task 1.2: Collection dedup check

**Spec:** Before triggering collection, check if a snapshot was created within 60 seconds. If so, return `{ queued: false, reason: 'recent_collection_exists', lastCollectionAt: ... }`.

**Files:**
- `apps/collector/src/jobs/collect-domain.ts` — add dedup check at start of collection handler
- Needs `SnapshotRepository.findLatestByDomain()` to check `createdAt`

**Tests:**
- Test that rapid re-collection within 60s returns dedup response
- Test that collection after 60s proceeds normally

### Task 1.3: Update STATUS_REPORT.md

After verification, update PR-11 entry with specific evidence.

### Verification

```bash
bun run lint
bun run typecheck
bun run test
```

---

## Phase 2: PR-04 Portfolio E2E Proof (Largest remaining item)

**Priority:** P1
**Effort:** Medium (4-6 hours)
**Dependencies:** PR-00 (done)

### Task 2.1: Saved filter round-trip (PR-04.1)

**New test file:** `apps/web/hono/routes/portfolio.integration.test.ts`

**Tests:**
1. `POST /api/portfolio/filters` with complex criteria → verify 201
2. `GET /api/portfolio/filters/:id` → verify JSON round-trips exactly
3. Apply filter to `GET /api/portfolio/search` → verify filtering logic
4. `DELETE /api/portfolio/filters/:id` → verify 200
5. Verify audit events for each operation

**Key files:**
- `apps/web/hono/routes/portfolio.ts` — `POST /filters`, `GET /filters/:id`, `DELETE /filters/:id`
- `packages/db/src/repos/portfolio.ts` — `SavedFilterRepository`

### Task 2.2: Template override scope (PR-04.2)

**Tests:**
1. `POST /api/portfolio/template-overrides` for provider=google, appliesToDomains=["example.com"]
2. `GET /api/mail/provider-templates/compare?domain=example.com` → override applied
3. Same for `other-domain.com` → override NOT applied
4. Global override (no appliesToDomains) → applies to all

**Key files:**
- `apps/web/hono/routes/portfolio.ts` — template override CRUD
- `apps/web/hono/routes/provider-templates.ts` — template comparison

### Task 2.3: Audit log completeness (PR-04.3)

**Tests:** Parameterized `triggerAndVerifyAudit()` covering:
- Note CRUD (1 test)
- Tag CRUD (1 test)
- Filter CRUD (1 test)
- Monitoring lifecycle (2 tests: create + toggle)
- Alert lifecycle (2 tests: ack + resolve)
- Remediation (1 test)
- Shared report (1 test)
- Tenant isolation: query as tenant B → should not see tenant A's events

**Key files:**
- `apps/web/hono/routes/portfolio.ts` — all CRUD + `GET /api/portfolio/audit`
- `packages/db/src/repos/portfolio.ts` — `AuditEventRepository`

### Task 2.4: Shared report token access (PR-04.4)

**Tests:**
1. Create shared report → get token
2. `GET /api/alerts/reports/token/:token` without auth → 200
3. Expire report → token returns 404/410
4. Report with past `expiresAt` → inaccessible immediately

**Key files:**
- `apps/web/hono/routes/alerts.ts` — shared report routes
- Check for `GET /api/alerts/reports/token/:token` handler

### Task 2.5: Alert dedup / noise budget (PR-04.5)

**Tests:**
1. Two alerts with same `dedupKey` within suppression window → only one created
2. Alerts up to `maxAlertsPerDay` → subsequent suppressed
3. Suppressed alerts visible with suppression metadata

**Key files:**
- `apps/web/hono/routes/alerts.ts` — alert creation
- Check for dedup logic in `AlertRepository` or inline in route

### Important: Test infrastructure

These tests should ideally run against **real PostgreSQL** (not mock DB). Check if existing integration test patterns use real DB or if a mock pattern is sufficient for this round.

If mock-DB only: write tests using the mock-DB pattern from existing `alerts.test.ts` and `portfolio.test.ts`. Note this as a limitation.

### Verification

```bash
bun run lint
bun run typecheck
bun run test
bun run --filter @dns-ops/web e2e
```

---

## Phase 3: PR-03 Legacy Bridge Hardening

**Priority:** P2
**Effort:** Small (1-2 hours)
**Dependencies:** None (independent)

### Task 3.1: Startup validation for legacy tool URLs (PR-03.1)

**Files:**
- `apps/web/hono/routes/legacy-tools.ts` — add validation check
- When env vars (`LEGACY_MX_LOOKUP_URL`, `LEGACY_BLACKLIST_CHECK_URL`, etc.) are missing:
  - Log warning on first access
  - Return `503` with `{ error: '...', code: 'INFRA_CONFIG_MISSING' }`

**Tests:**
- Add test case in `apps/web/hono/routes/legacy-tools.runtime.test.ts` for 503 when env is unset

### Task 3.2: Deep-link URL safety (PR-03.2)

**Tests to add in `apps/web/hono/routes/legacy-tools.runtime.test.ts`:**
1. Domain: `example.com?evil=true&redirect=http://attacker.com` → URL-encoded, no param injection
2. Domain: `example.com"><script>alert(1)</script>` → sanitized output
3. Domain: `münchen.de` (IDN) → correct handling

### Verification

```bash
bun run lint
bun run typecheck
bun run test
```

---

## Phase 4: Final Cleanup

**Priority:** P2
**Effort:** Trivial (30 min)
**Dependencies:** Phases 1-3

### Task 4.1: Investigate 32 skipped tests

```bash
bun run test 2>&1 | grep -i "skip"
```

Triage each skip — document why or un-skip.

### Task 4.2: README reconciliation

Compare `README.md` claims against shipped UI. Flag overclaims (especially snapshot diff/history UI, shadow comparison breadth).

### Task 4.3: PR-12.4 — Regenerate STATUS_REPORT.md

Must be last. Rerun all verification commands and update from actual output.

---

## Execution Order

```
Phase 1 (PR-11 gaps)     ─── 2-3 hours ──→ commit
Phase 2 (PR-04)          ─── 4-6 hours ──→ commit  (can run agents in parallel)
Phase 3 (PR-03)          ─── 1-2 hours ──→ commit  (independent, parallelizable)
Phase 4 (cleanup)        ─── 30 min    ──→ commit  (must be last)
                                            ───────
                                Total:      ~8-12 hours
```

Phases 1, 2, and 3 can run in parallel if using agent delegation.
Phase 4 must be last.

---

## Ship Decision After Plan Completion

After all phases complete:
- `apps/web` — **GO** (all PR beads verified)
- `apps/collector` — **GO** (all PR beads verified)
- Only remaining residual: DNS rebinding TOCTOU (documented, probe feature-flagged)
