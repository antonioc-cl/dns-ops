# Bead 07 — Snapshot history and diff

**Purpose**  
Make before/after DNS change analysis trustworthy as soon as persisted findings exist.

**Prerequisites**  
Bead 06.

**Concrete change**  
Add snapshot comparison workflows:
- snapshot list per domain,
- compare-latest,
- manual snapshot-to-snapshot diff,
- changed records, TTLs, findings, scope, and ruleset version visibility.

**Invariants**
- Diff is bounded by stored scope.
- Unknown vs unchanged must remain distinct.
- Ruleset-change and scope-change warnings are explicit.

**Validation / tests**
- Diff tests for value, TTL, scope, ruleset, and findings changes.
- UI tests for readability and ambiguity labeling.

**Definition of done**
- A user can compare two snapshots and understand what changed and what stayed unknown.
