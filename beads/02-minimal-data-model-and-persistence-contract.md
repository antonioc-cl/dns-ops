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
