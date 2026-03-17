# DNS Ops Workbench — Implementation Beads
**Commitment boundary:** Beads **01–09** are the committed build path. Beads **10–15** are conditional extensions and should only start if the earlier beads prove value and execution bandwidth exists.
## Parallel lanes at a glance
- After **Bead 02**, **Bead 02A** starts immediately and should finish before meaningful app code lands.
- After **Bead 02A**, **Bead 03** and **Bead 04** can run in parallel.
- After **Beads 03 + 04**, **Bead 05** and **Bead 06** can run in parallel.
- After **Bead 05**, **Bead 07** can start while **Bead 06** finishes.
- After **Beads 06 + 07**, **Bead 08** starts.
- After **Bead 08**, **Bead 09** and **Bead 10** can run in parallel if non-DNS probes are approved.
- After **Bead 09**, **Bead 11** and **Bead 12** can run in parallel.
- After **Bead 12**, **Bead 13** can start.
- After **Beads 11 + 13**, **Bead 14** can start.
- After **Bead 14**, **Bead 15** can start.

# Bead 01 — Pilot corpus, status vocabulary, and trust boundary

**Purpose**  
Turn the memo into executable acceptance criteria and eliminate ambiguity before code starts.

**Prerequisites**  
None.

**Concrete change**  
Create the project’s baseline operational artifacts:
- Benchmark corpus of representative domains and cases:
  - known-good managed zones,
  - known-good unmanaged zones,
  - historical incident cases,
  - intentionally misconfigured test zones,
  - IDN/punycode case,
  - wildcard case,
  - NXDOMAIN case,
  - NODATA case,
  - stale-IP migration case.
- Shared enums and vocabulary:
  - result state: `complete | partial | failed`,
  - severity,
  - confidence,
  - risk posture,
  - blast radius,
  - `review_only`.
- Initial targeted-inspection scope for unmanaged zones:
  - phase-1 names and types to query,
  - how scope is displayed in the UI.
- Initial trust-boundary policy for non-DNS probes:
  - allowed probe types,
  - blocked address space,
  - egress restrictions,
  - timeout/concurrency limits.

**Invariants**
- Unmanaged zones must default to **partial** visibility.
- No artifact may imply full-zone enumeration for arbitrary third-party domains.
- Risky changes must be marked **review-only**.
- The rules engine will be authoritative, not AI summaries.

**Validation / tests**
- Review benchmark corpus against manual `dig`/authoritative checks.
- Confirm every benchmark case has a known expected outcome or explicit “ambiguous by design” label.
- Verify the status vocabulary covers every benchmark case without special-case wording.

**Rollout or migration notes**
- Internal-only artifact.
- This bead replaces informal expectations with a single source of truth for testing and acceptance.

**Rollback plan**
- Revert the artifacts in version control.
- Keep prior benchmark items archived, not deleted, so test history remains explainable.

**Definition of done**
- Benchmark corpus exists in the repo.
- Status/risk/blast-radius vocabulary is committed and referenced by later beads.
- Initial query scope and probe policy are agreed and documented.


# Bead 02 — Minimal data model and persistence contract

**Purpose**  
Create the stable backbone for observations, snapshots, findings, and later diff/search features.

**Prerequisites**  
Bead 01.

**Concrete change**  
Implement the minimal persistence model and contracts:
- Core entities:
  - `Domain`,
  - `Snapshot`,
  - `Observation`,
  - `VantagePoint`,
  - `RecordSet`,
  - `Finding`,
  - `Suggestion`,
  - `RulesetVersion`.
- Add `tenant_id` as nullable or reserved for later enforcement, without building the full permissions model yet.
- Store explicit snapshot scope:
  - queried names,
  - queried record types,
  - queried vantage points,
  - timestamp,
  - ruleset version.
- Enforce append-only observations.
- Define API/serialization contracts for snapshot read/write.

**Invariants**
- Raw observations are immutable.
- Snapshot scope is explicit and query-bounded.
- Findings are versioned by ruleset.
- Parsed state must never overwrite raw evidence.

**Validation / tests**
- Migration tests for schema creation and rollback safety.
- Serialization round-trip tests for observations and findings.
- Immutability tests that reject mutation of stored observations.
- Scope tests that prove a snapshot cannot exist without queried-name/type metadata.

**Rollout or migration notes**
- New tables only.
- No dependency on legacy DMARC/DKIM tools yet.
- Keep this isolated from existing tooling to avoid accidental coupling.

**Rollback plan**
- Disable writes to the new schema.
- Leave the schema in place but unused rather than performing destructive rollback.
- Revert application code paths to no-op or raw in-memory responses.

**Definition of done**
- A snapshot with observations and findings can be written and read end-to-end in dev/test.
- Schema contracts are stable enough for worker and UI work to proceed in parallel.


# Bead 02A — Stack, runtime split, and repo scaffold

**Purpose**  
Make the implementation shape explicit so the team can scaffold once and avoid accidental architecture drift.

**Prerequisites**  
Beads 01–02.

**Concrete change**  
Adopt the chosen implementation stack and scaffold the monorepo.

### Chosen stack
- **App shell:** TanStack Start + Hono + TanStack Query + Tailwind + shadcn/ui
- **App runtime:** Cloudflare Workers
- **Database:** Postgres + Drizzle ORM
- **Collector / probe runtime:** separate Node.js worker service

### Repo scaffold
Create a monorepo with this high-level shape:
- `apps/web` — TanStack Start app shell deployed to Workers
- `apps/collector` — Node worker for DNS/mail/delegation collection and approved probes
- `packages/db` — shared Drizzle schema/client
- `packages/contracts` — shared types/enums/contracts
- `packages/rules` — deterministic rules engine and rule packs
- `packages/parsing` — DNS/mail parsing and dig formatting helpers
- `packages/testkit` — benchmark corpus, fixtures, golden tests
- `docs/` — memo, beads, rules notes, benchmark notes

Create the initial root workspace files:
- workspace config
- shared tsconfig
- formatting/linting config
- CI skeleton
- `wrangler` config for the web app
- Dockerfile for collector

**Invariants**
- The collector/probe runtime is a separate execution surface from the app shell.
- Non-DNS probes must not be forced into the Workers runtime.
- Contracts are shared from one package, not copied between apps.
- Rules remain deterministic TypeScript code, not an AI interpretation layer.

**Validation / tests**
- Workspace bootstraps successfully.
- `apps/web` and `apps/collector` both build.
- Shared packages type-check across both apps.
- Basic CI runs install, lint, and type-check.

**Rollout or migration notes**
- This bead is foundational and should happen before meaningful app code lands.
- It does not change legacy DMARC/DKIM tools.
- Keep the collector boundary even if early job execution is still minimal.

**Rollback plan**
- Revert scaffold commits if the workspace shape proves unworkable.
- Preserve shared contracts and DB schema work in separate commits where possible.

**Definition of done**
- The monorepo exists with the chosen app/runtime split.
- Both apps build.
- Shared packages are wired and importable.
- A recommended repo structure is committed in documentation.


# Bead 03 — DNS collection worker MVP

**Purpose**  
Collect raw DNS evidence for the first usable product slice.

**Prerequisites**  
Beads 01–02A.

**Concrete change**  
Implement the worker/service that performs targeted DNS collection:
- Query supported phase-1 types:
  - `A`, `AAAA`, `CNAME`, `MX`, `TXT`, `NS`, `SOA`, `CAA`.
- Query the initial unmanaged-zone targeted names from Bead 01.
- Collect from at least:
  - one public recursive vantage,
  - the authoritative nameserver set.
- Store:
  - query name/type,
  - resolver or nameserver identity,
  - source type,
  - region/network identity where available,
  - transport,
  - response code,
  - flags,
  - TTLs,
  - answer/authority/additional sections,
  - timeout/refusal/truncation errors.
- Create snapshots on demand from the UI or internal API.

**Invariants**
- Read-only behavior only.
- No background scanning yet.
- Partial, timeout, refusal, and error states are first-class outputs.
- No claim of full-zone coverage for unmanaged zones.

**Validation / tests**
- Integration tests against controllable test zones.
- Cases for:
  - authoritative success,
  - recursive success,
  - timeout,
  - refusal,
  - truncation,
  - divergent answers across vantages,
  - empty answer vs NXDOMAIN.
- Load tests for safe concurrency and timeout handling.

**Rollout or migration notes**
- Start as an internal-only endpoint or worker queue.
- Do not connect it to any scheduled refresh yet.

**Rollback plan**
- Disable the worker route/queue.
- Keep previously stored observations for debugging.
- Fall back to no live collection rather than degraded collection.

**Definition of done**
- A requested domain produces stored observations for supported types from required DNS vantages.
- Failure states are stored and visible, not swallowed.


# Bead 04 — Domain 360 shell

**Purpose**  
Give operators a usable entry point fast, even before deeper rules and mail logic land.

**Prerequisites**  
Beads 01–02A.

**Concrete change**  
Build the first UI shell:
- Domain lookup input and normalized domain handling.
- Domain 360 page with:
  - Overview tab,
  - DNS tab,
  - Mail tab placeholder,
  - Delegation tab placeholder,
  - History tab placeholder.
- Status badges:
  - `managed` / `unmanaged`,
  - `complete` / `partial` / `failed`.
- Snapshot refresh action.
- Explicit scope label showing that unmanaged zones are targeted inspection only.

**Invariants**
- The UI must not imply completeness for unmanaged zones.
- Raw evidence must remain discoverable with minimal friction.
- Internal-only access.

**Validation / tests**
- UI tests for:
  - domain normalization,
  - IDN input,
  - state badge rendering,
  - empty/error states.
- Smoke tests that the shell can load a snapshot or a “not yet collected” state cleanly.

**Rollout or migration notes**
- Feature-flagged for internal pilot users only.
- No cutover impact on legacy tools.

**Rollback plan**
- Disable the route or feature flag.
- Keep the backend untouched.

**Definition of done**
- An operator can enter a domain, trigger collection, and land on a stable page that clearly shows scope and state.


# Bead 05 — Snapshot read path plus raw / parsed / dig views

**Purpose**  
Make collected evidence inspectable and trustworthy.

**Prerequisites**  
Beads 02–04.

**Concrete change**  
Implement the read path and presentation layers for phase-1 DNS data:
- Normalize supported RR types into `RecordSet`s.
- Add three views:
  - raw response,
  - parsed record view,
  - dig-style text view.
- Show:
  - TTLs,
  - source/vantage labels,
  - errors/timeouts/refusals,
  - snapshot metadata,
  - queried names/types/vantages.

**Invariants**
- Raw data remains the source of truth.
- Parsed view cannot suppress raw errors or uncertainty.
- Snapshot scope must be visible.

**Validation / tests**
- Parser golden tests for:
  - TXT string splitting,
  - CNAME chains,
  - NXDOMAIN vs NODATA,
  - wildcard responses,
  - punycode rendering,
  - empty additional/authority sections.
- UI tests for switching between raw/parsed/dig views.

**Rollout or migration notes**
- Ship this to pilot users before findings if needed.
- Trust is built here; avoid over-polishing at the expense of accuracy.

**Rollback plan**
- Fall back to raw-only view if parsing misbehaves.
- Keep stored observations unchanged.

**Definition of done**
- Pilot users can inspect any collected snapshot end-to-end without leaving the workbench.


# Bead 06 — Legacy DMARC/DKIM adapters

**Purpose**  
Preserve current trust and unify workflow without blocking the MVP on reimplementation.

**Prerequisites**  
Bead 04.

**Concrete change**  
Integrate the existing DMARC and DKIM tools into the new surface:
- Mail tab contains:
  - deep links or embedded panels to current tools,
  - domain context pre-filled,
  - return path back to Domain 360.
- Log access and domain context for later shadow-comparison analysis.

**Invariants**
- Legacy DMARC/DKIM outputs remain authoritative.
- New UI must not reinterpret or override legacy results yet.
- No changes to legacy tool internals are required in this bead.

**Validation / tests**
- Smoke tests for link/embed behavior.
- Auth/session tests if the tools are protected.
- Ensure domain context is preserved and accurate.

**Rollout or migration notes**
- Internal-only.
- This is a bridge, not the target architecture.

**Rollback plan**
- Remove adapters from the workbench.
- Keep legacy tools reachable directly as before.

**Definition of done**
- An operator can move from Domain 360 to the existing DMARC/DKIM tool surfaces in one step and back again.


# Bead 07 — Rules engine core plus first DNS findings

**Purpose**  
Introduce deterministic, evidence-backed findings without waiting for the full mail stack.

**Prerequisites**  
Beads 01, 02, and 05.

**Concrete change**  
Implement the rules engine and first benchmark-backed rule pack:
- Rules engine reads normalized observations and emits:
  - `Finding`,
  - `Suggestion`,
  - severity,
  - confidence,
  - risk posture,
  - blast radius,
  - `review_only`.
- Initial DNS rules:
  - authoritative lookup failure/timeouts,
  - mismatch across authoritative servers for the same queried name/type,
  - recursive vs authoritative mismatch,
  - CNAME coexistence conflict,
  - explicit partial-coverage finding on unmanaged zones.
- Findings panel on Overview.

**Invariants**
- Findings must derive only from stored evidence.
- Rules are versioned.
- AI is not allowed to originate authoritative findings.
- Review-only must be set for anything with real blast radius.

**Validation / tests**
- Golden tests from the benchmark corpus.
- Evidence-link tests proving every finding can point back to concrete observations.
- Versioning tests proving the same snapshot can be re-evaluated under different ruleset versions.

**Rollout or migration notes**
- Ship findings as internal pilot only.
- Treat these as benchmark-backed, not exhaustive.

**Rollback plan**
- Disable rules evaluation and hide findings panel.
- Keep raw/parsed views intact.

**Definition of done**
- Operators see deterministic DNS findings with evidence links and versioned suggestions.


# Bead 08 — Mail collection core plus DKIM selector strategy

**Purpose**  
Bring mail evidence into the same evidence model and resolve the selector-discovery ambiguity explicitly.

**Prerequisites**  
Beads 03, 05, and 06.

**Concrete change**  
Extend collection and normalization for mail-related checks:
- Collect and store observations for:
  - `MX`,
  - SPF-bearing TXT,
  - `_dmarc`,
  - candidate DKIM selectors,
  - `_mta-sts`,
  - `_smtp._tls`,
  - Null MX detection.
- Implement explicit selector-discovery precedence:
  1. managed-zone configured selectors if available,
  2. operator-supplied selectors if present,
  3. provider-specific heuristics for the narrow supported set,
  4. limited common-selector dictionary,
  5. no selector found → `partial`, not automatic failure.
- Record selector provenance and confidence.

**Invariants**
- Heuristic selector discovery must be labeled as heuristic.
- Absence of a discovered selector is not the same as absence of DKIM.
- Legacy DMARC/DKIM tools remain authoritative until parity is proven.

**Validation / tests**
- Cases for:
  - Google/Microsoft/common provider selectors,
  - multiple selectors,
  - no selector discovered,
  - Null MX,
  - SPF TXT parsing.
- Ensure selector provenance is rendered and stored.

**Rollout or migration notes**
- Start with a narrow set of providers actually seen in the client base.
- Keep legacy tools visible during the transition.

**Rollback plan**
- Disable new mail collection paths.
- Keep adapters and raw DNS views intact.

**Definition of done**
- Mail-related observations are collected, stored, and rendered with explicit selector provenance.


# Bead 09 — Mail rules, shadow comparison, and provider templates v1

**Purpose**  
Make mail diagnosis operationally useful while keeping cutover risk near zero.

**Prerequisites**  
Beads 06–08.

**Concrete change**  
Implement the first mail rules and shadow mode:
- Mail rules for:
  - MX present / absent,
  - Null MX posture,
  - SPF exists / malformed / absent,
  - DMARC exists / policy posture,
  - DKIM key presence for discovered selectors,
  - MTA-STS TXT presence,
  - TLS-RPT TXT presence,
  - BIMI as info-only unless ruleset support is justified.
- Shadow comparison of new DMARC/DKIM logic against legacy outputs.
- Narrow provider-template pack for top 3–5 providers actually used in the client base.
- Data-backed template storage so trusted internal operators can update expectations without app rewrites.

**Invariants**
- Legacy DMARC/DKIM outputs remain authoritative until the parity gate passes.
- High-risk suggestions remain review-only.
- Provider templates stay narrow and explicitly scoped.

**Validation / tests**
- Benchmark-based golden tests for mail rules.
- Shadow mismatch dashboard or report.
- Manual adjudication of every shadow mismatch before cutover.
- Template tests proving expected-vs-actual comparisons are accurate for supported providers.

**Rollout or migration notes**
- Present new mail findings as **preview** until parity is acceptable.
- Graduate checks one by one, not all at once.

**Rollback plan**
- Demote new mail findings back to preview-only or hide them entirely.
- Continue using legacy DMARC/DKIM surfaces.

**Definition of done**
- Operators can inspect useful mail findings in one place.
- Shadow comparison data exists and is stable enough to evaluate parity.
- At least one provider template produces a correct expected-vs-actual result on pilot domains.


# Bead 10 — Non-DNS probe sandbox

**Purpose**  
Enable safe MTA-STS/SMTP/TLS checks only if the project decides they are worth the extra operational complexity.

**Prerequisites**  
Beads 01, 02, and 08.

**Concrete change**  
Implement a separate probe execution path:
- Separate worker pool and separate egress IP space from production mail systems.
- Allowlist probe destinations derived from DNS results only.
- Hard-block:
  - private/internal address space,
  - loopback,
  - link-local,
  - arbitrary user-specified endpoints.
- Support initial explicit-action probes for:
  - MTA-STS policy fetch,
  - limited SMTP STARTTLS capability check.
- Store probe outcomes as observations with distinct source type.

**Invariants**
- Non-DNS probes must never run from production mail egress.
- No arbitrary outbound probing.
- Strict timeouts and concurrency limits.
- Probes remain read-only.

**Validation / tests**
- SSRF guard tests.
- Network allow/deny tests.
- Timeouts and concurrency tests.
- Security review on worker isolation and egress policy.

**Rollout or migration notes**
- Disabled by default.
- Start with operator-triggered probing only.
- Do not schedule probes automatically at first.

**Rollback plan**
- Disable probe workers and hide probe-derived findings.
- Keep DNS-only mail analysis available.

**Definition of done**
- Approved non-DNS probes can run safely and produce observations without violating the trust boundary.


# Bead 11 — Limited fleet report

**Purpose**  
Capture early portfolio value without waiting for a full portfolio UI.

**Prerequisites**  
Beads 07–09 and a usable domain inventory source.

**Concrete change**  
Implement a narrow batch-check/report flow:
- Accept a curated inventory from:
  - hosting DB,
  - internal table,
  - CSV import.
- Run targeted checks across that inventory.
- Produce an internal report for a very small high-value query set:
  - missing SPF,
  - weak/non-enforcing DMARC,
  - stale infrastructure IPs,
  - missing expected mail records for supported providers.

**Invariants**
- Results are scoped to the supplied inventory, not “all domains.”
- Checks remain targeted and read-only.
- High-risk changes remain review-only.

**Validation / tests**
- Batch run against sample inventory.
- Spot-check reported domains against manual evidence.
- Confirm at least one report row is actionable and correct.

**Rollout or migration notes**
- Start with exports or static internal reports, not a full fleet dashboard.
- Prefer manual or on-demand batch runs before scheduled runs.

**Rollback plan**
- Disable batch jobs/reports.
- Keep single-domain analysis intact.

**Definition of done**
- One fleet report has identified a real proactive remediation or prevented a migration/incident issue.


# Bead 12 — Delegation vantage collector

**Purpose**  
Add the evidence required for parent/authoritative/resolver delegation diagnosis.

**Prerequisites**  
Beads 02, 03, 05, and 07.

**Concrete change**  
Extend collection for delegation diagnostics:
- Add parent-zone delegation view.
- Store per-authoritative-server answers and inconsistencies.
- Capture glue-related data where available.
- Capture basic DNSSEC-related observation fields and validation source identity when present.
- Record which authoritative server returned what.

**Invariants**
- DNSSEC conclusions must not be overstated beyond the validating source.
- Raw delegation evidence remains immutable.
- Ambiguity must be surfaced, not smoothed over.

**Validation / tests**
- Test zones for:
  - mismatched NS sets,
  - lame delegation,
  - glue variation,
  - DNSSEC present/absent,
  - per-authoritative divergence.
- Ensure findings point back to the correct parent/authoritative source.

**Rollout or migration notes**
- Feature-flag the data collection before exposing UI findings.
- Keep this separate from phase-1 DNS rules until stable.

**Rollback plan**
- Disable delegation collection and hide related UI.
- Preserve stored delegation observations for analysis.

**Definition of done**
- Snapshots include parent, authoritative, and delegation evidence for benchmark domains.


# Bead 13 — History and diff

**Purpose**  
Make propagation and before/after change analysis first-class.

**Prerequisites**  
Beads 05 and 12, plus enough stored snapshots to compare.

**Concrete change**  
Add snapshot history and diff support:
- Snapshot list per domain.
- Before/after diff.
- Vantage-to-vantage diff.
- Highlight:
  - changed records,
  - changed TTLs,
  - changed findings,
  - changed query scope,
  - changed ruleset version.

**Invariants**
- Diffs are bounded by explicit scope.
- “No change in queried scope” must not imply “no change in whole zone.”
- Unknown vs unchanged must remain distinguishable.

**Validation / tests**
- Diff tests for:
  - value changes,
  - TTL-only changes,
  - vantage mismatch,
  - query-scope changes,
  - ruleset-version changes.
- UI tests for readability and ambiguity labeling.

**Rollout or migration notes**
- Start with manual/on-demand snapshots before any scheduled refresh.
- Use this heavily in migrations before expanding elsewhere.

**Rollback plan**
- Hide diff UI.
- Keep snapshot storage untouched.

**Definition of done**
- An operator can compare two snapshots and clearly see what changed, what did not, and what remained unknown.


# Bead 14 — Portfolio search, notes, and template management

**Purpose**  
Turn the workbench into a cross-domain operational multiplier.

**Prerequisites**  
Beads 11 and 13, plus a real inventory source.

**Concrete change**  
Build the first portfolio layer:
- Search/filter across domains and findings.
- Saved filters.
- Tags/notes per domain.
- Template override/edit surface for trusted operators.
- Tenant-aware permissions and audit logging.

**Invariants**
- Search results are inventory-scoped.
- Notes and template changes must be auditable.
- Internal permissions must be enforced before broader exposure.
- Template edits remain data-backed, not code-only.

**Validation / tests**
- Search and filter correctness tests.
- Permission tests for tenant/domain access.
- Audit-log tests for note and template changes.
- Template-override tests proving changes only affect intended scopes.

**Rollout or migration notes**
- Limit to trusted internal roles first.
- Do not open template editing broadly until auditability is proven.

**Rollback plan**
- Disable portfolio views and editing.
- Keep underlying data but stop exposing it.

**Definition of done**
- A trusted operator can find domains across the portfolio, annotate them, and adjust supported template expectations without code changes.


# Bead 15 — Scheduled refresh, monitoring, alerts, and shared reports

**Purpose**  
Add proactive operations only after the single-domain and portfolio workflows are already trusted.

**Prerequisites**  
Beads 11, 13, and 14, plus stable runtime cost and acceptable false-positive performance.

**Concrete change**  
Implement the first proactive layer:
- Scheduled refresh jobs for a narrow monitored set.
- Alert rules with suppression/deduplication.
- Shared read-only reports with bounded evidence views.
- Optional enrichment such as registration/expiry data if justified.

**Invariants**
- Monitoring must respect a defined noise budget.
- Alerts must never bypass review-only safeguards.
- Shared reports must not expose internal notes or imply completeness for unmanaged zones.
- Monitoring starts small and opt-in.

**Validation / tests**
- Scheduler and retry tests.
- Alert dedup/suppression tests.
- Report permission and redaction tests.
- Trial run on a narrow monitored subset to measure noise rate.

**Rollout or migration notes**
- Start with one alert channel and a small domain subset.
- Do not monitor the whole portfolio by default.

**Rollback plan**
- Disable schedules and alerts.
- Keep manual on-demand analysis and stored snapshots available.

**Definition of done**
- Monitoring has produced at least one validated proactive save without creating unsustainable alert noise.


# Dependency order summary

1. **Bead 01** — Pilot corpus, status vocabulary, trust boundary
2. **Bead 02** — Minimal data model and persistence contract
3. **Bead 02A** — Stack, runtime split, and repo scaffold
4. **Bead 03** — DNS collection worker MVP
5. **Bead 04** — Domain 360 shell
6. **Bead 05** — Snapshot read path plus raw / parsed / dig views
7. **Bead 06** — Legacy DMARC/DKIM adapters
8. **Bead 07** — Rules engine core plus first DNS findings
9. **Bead 08** — Mail collection core plus DKIM selector strategy
10. **Bead 09** — Mail rules, shadow comparison, and provider templates v1
11. **Bead 10** — Non-DNS probe sandbox
12. **Bead 11** — Limited fleet report
13. **Bead 12** — Delegation vantage collector
14. **Bead 13** — History and diff
15. **Bead 14** — Portfolio search, notes, and template management
16. **Bead 15** — Scheduled refresh, monitoring, alerts, and shared reports

# Recommended stopping points

- **After Bead 05:** usable DNS evidence viewer.
- **After Bead 07:** first trustworthy DNS findings.
- **After Bead 09:** first real mail diagnosis MVP.
- **After Bead 11:** first portfolio-level business value.
- **After Bead 13:** strong migration/incident workflow.
- **After Bead 15:** proactive ops platform.
