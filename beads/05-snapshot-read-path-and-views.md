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
