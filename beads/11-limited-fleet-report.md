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
