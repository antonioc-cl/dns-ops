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
