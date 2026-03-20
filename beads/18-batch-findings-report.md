# Bead 18 — Batch findings report

**Purpose**  
Capture early fleet value without building a second analysis engine.

**Prerequisites**  
Beads 11–13.

**Concrete change**  
Implement a narrow batch report/export layer that consumes stored findings and snapshots:
- curated inventory input,
- internal report/export for a small set of high-value conditions,
- report rows derived from stored evidence and stored findings.

**Invariants**
- Batch reporting may not fork the rules logic into a separate heuristic engine.
- Results stay inventory-scoped and read-only.
- Fleet value comes from the same truth model used for single-domain analysis.

**Validation / tests**
- Batch run tests against sample inventory.
- Spot-check report rows against stored findings and raw evidence.

**Definition of done**
- The team can generate an actionable internal fleet report without duplicating analysis logic.
