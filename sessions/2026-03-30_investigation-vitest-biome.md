# Investigation: Vitest timeouts and Biome hangs

## Summary
Vitest timeout is most likely not a single slow test file. Evidence points to accidental Redis-backed integration test activation in CI plus incomplete BullMQ/Redis cleanup, leaving open handles that delay or prevent clean Vitest exit. Biome is not truly hanging in current repros; broad repo-root scope plus operational state directories and diagnostic flood make it look hung.

## Symptoms
- Full vitest suite times out around 90-120s.
- Individual test files pass or fail quickly in isolation.
- Biome full-scope checks were reported as hanging.

## Investigation Log

### Initial assessment - Root entrypoints
**Hypothesis:** Root scripts/config, not package-local config, control current failures.
**Findings:** Root `package.json` runs `vitest run`; root `vitest.config.ts` includes all package/app tests. CI runs `pnpm test` and `bun run lint`.
**Evidence:** `package.json:13-18`; `vitest.config.ts:3-13`; `.github/workflows/ci.yml:84-93`.
**Conclusion:** Full-suite behavior must be explained from root suite + CI env, not from per-package scripts alone.

### Vitest - Redis integration auto-enabled in CI
**Hypothesis:** CI is unintentionally enabling integration tests.
**Findings:** CI exports `REDIS_URL` job-wide. Collector integration blocks decide whether to run purely from `process.env.REDIS_URL !== undefined`.
**Evidence:** `.github/workflows/ci.yml:32-35`; `apps/collector/src/jobs/queue.test.ts:488-497,609-616`; `apps/collector/src/jobs/scheduler.test.ts:156-166`.
**Conclusion:** `pnpm test` in CI can expand into Redis integration coverage even when the test step only intended `RUN_LIVE_DNS_TESTS=0`.

### Vitest - Open handle leaks in queue/worker lifecycle
**Hypothesis:** Tests finish assertions but leave BullMQ/Redis handles open.
**Findings:** `getQueueHealth()` creates fresh queue instances for each health read and never closes them. `closeQueues()` only closes singleton queues. `stopWorkers()` closes workers only, not queues/shared Redis. `cleanupSchedules()` removes repeatable jobs and clears memory state, but does not close queue/Redis connections.
**Evidence:** `apps/collector/src/jobs/queue.ts:242-259` and `apps/collector/src/jobs/queue.ts:264-283`; `apps/collector/src/jobs/worker.ts:456-472`; `apps/collector/src/jobs/scheduler.ts:331-343`.
**Conclusion:** Strong root-cause candidate for full-suite timeout / delayed exit.

### Vitest - Current config mitigation invalid
**Hypothesis:** Recent `poolOptions` edits may not actually mitigate anything.
**Findings:** Uncommitted root/package config changes add `pool:'forks'`, `poolOptions:{forks:{maxForks:4}}`, `isolate:true`. Running Vitest shows a deprecation warning: `test.poolOptions` removed in Vitest 4.
**Evidence:** `vitest.config.ts:10-12`; `apps/collector/vitest.config.ts:7-9`; `packages/parsing/vitest.config.ts:7-9`; `packages/rules/vitest.config.ts:7-9`; runtime output from `bunx vitest run ...` showing Vitest 4 deprecation.
**Conclusion:** Current config tweak is not a reliable fix; may be ignored or misleading.

### Vitest - Heavy suites are contributors, not primary cause
**Hypothesis:** One slow test file explains the 90-120s timeout.
**Findings:** `delegation.test.ts` completes in ~0.98s with `--maxWorkers=1` despite assertion failures. `probe-ratelimit.test.ts` completes in ~2.48s total, ~1.82s tests. These add runtime, but do not explain the full timeout alone.
**Evidence:** Runtime commands: `bunx vitest run apps/web/hono/routes/delegation.test.ts --maxWorkers=1 --reporter=dot`; `bunx vitest run apps/collector/src/probes/probe-ratelimit.test.ts --maxWorkers=1 --reporter=dot`.
**Conclusion:** `--maxWorkers=1` is useful for triage, not a real fix.

### Biome - Broad scope, not true hang
**Hypothesis:** Biome itself is hanging.
**Findings:** `bunx biome check apps packages --max-diagnostics=20` completed in ~19.9s on 262 files. `bunx biome check . --max-diagnostics=20` also completed in ~20.0s on 417 files, but included diagnostics from `.beads/**` and `.pi/**`. Biome also flagged current ignore-folder patterns as suboptimal. State trees are large: `.pi` ~699 files / ~594 MB; `.beads` ~56 files / ~3.3 MB.
**Evidence:** runtime outputs for both Biome commands; `biome.json:4-15`; size scan of `.pi`, `.beads`, `beads`, `sessions`, `docs`.
**Conclusion:** Current issue is scope overload + noisy diagnostics from non-product trees, not a hard hang in the validated repro.

### Regression window
**Hypothesis:** This was always broken.
**Findings:** Commit `1631cf5b` (`2026-03-24`) says CI switched to `pnpm test` and reported `956 pass, 3 fail`.
**Evidence:** `git show 1631cf5b` commit message.
**Conclusion:** Current timeout likely regressed after 2026-03-24 via later suite growth, current uncommitted changes, or both.

## Root Cause
Most defensible narrative:
1. Root suite is run from `pnpm test` -> root `vitest.config.ts`.
2. CI sets `REDIS_URL` job-wide (`.github/workflows/ci.yml:32-35`).
3. Collector Redis integration tests are gated by env presence, not an explicit test flag (`queue.test.ts:488-497,609-616`; `scheduler.test.ts:156-166`).
4. When these paths run, queue/worker lifecycle cleanup is incomplete (`queue.ts:242-259,264-283`; `worker.ts:456-472`; `scheduler.ts:331-343`).
5. Result: full suite can pass/fail assertions but still wait on open BullMQ/Redis handles, causing 90-120s timeout behavior.
6. Concurrently, Biome broad root scans include operational/state trees because `biome.json` uses `"**"` includes without excluding `.pi` / `.beads` / `beads` / `sessions`, so repo-root checks produce large noisy output and appear hung.

## Recommendations
1. Replace Redis integration gating with explicit opt-in flag in:
   - `apps/collector/src/jobs/queue.test.ts`
   - `apps/collector/src/jobs/scheduler.test.ts`
   Use `RUN_REDIS_INTEGRATION_TESTS === '1'`, not `REDIS_URL !== undefined`.
2. Scope CI env per step in `.github/workflows/ci.yml`:
   - remove job-wide `REDIS_URL` from the generic unit-test path
   - keep only `RUN_LIVE_DNS_TESTS=0` and `RUN_REDIS_INTEGRATION_TESTS=0` on the `pnpm test` step
   - add a separate Redis integration step if desired
3. Fix queue lifecycle in `apps/collector/src/jobs/queue.ts`:
   - reuse singleton queues in `getQueueHealth()` or close temporary queues immediately after use
4. Unify shutdown in collector tests/runtime:
   - `stopWorkers()` should coordinate with `closeQueues()` or a single higher-level shutdown helper
   - integration tests should always `afterAll` close workers, queues, and shared Redis
5. Revert deprecated Vitest `poolOptions` edits; if worker caps are still needed after leak fixes, use supported Vitest 4 options / CLI flags only.
6. Narrow Biome scope in `biome.json`:
   - exclude `.pi`, `.beads`, `beads`, `sessions`, and possibly `docs`
   - fix ignore-folder patterns to the current Biome form without trailing `/**`
7. Treat `--maxWorkers=1` as a diagnostic tool only, not as the final repo default.

## Preventive Measures
- Separate fast/default tests from infra-backed integration suites via explicit scripts and flags.
- Add a clean shutdown contract for Redis/BullMQ/DB resources in test helpers.
- Keep root validation focused on product code; operational/log/state trees must be excluded from lint scope.
- When Vitest upgrades, verify config options against official docs before committing mitigation changes.
