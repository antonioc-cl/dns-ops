# Bead 20 — Alerts and shared reports

**Purpose**  
Add proactive operations only after signal quality, auth, and job execution are trusted.

**Prerequisites**  
Beads 13, 18, and 19.

**Concrete change**  
Implement the first proactive ops layer:
- alert rules on stored findings/evaluations,
- suppression and deduplication,
- acknowledge/resolve workflow,
- shared read-only reports with bounded/redacted evidence.

**Invariants**
- Monitoring respects a defined noise budget.
- Alerts do not bypass review-only safeguards.
- Shared reports do not leak internal notes or imply unmanaged-zone completeness.

**Validation / tests**
- Alert dedup/suppression tests.
- Report permission/redaction tests.
- Narrow pilot run to measure noise and operator value.

**Definition of done**
- The system can produce low-noise proactive value without overstating what it knows.

---
