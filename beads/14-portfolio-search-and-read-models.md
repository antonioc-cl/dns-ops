# Bead 14 — Portfolio search and read models

**Purpose**  
Deliver cross-domain value safely, starting with read-only operator workflows.

**Prerequisites**  
Beads 07, 11–13.

**Concrete change**  
Build the read-only portfolio layer:
- search/filter across domains and findings,
- saved filter read path,
- inventory-scoped results,
- frontend route/navigation for portfolio search,
- read models based on stored findings and snapshots, not ad hoc parallel heuristics.

**Invariants**
- Portfolio search is inventory-scoped.
- Results come from stored evidence and stored findings.
- Read-only portfolio value ships before broader write surfaces.

**Validation / tests**
- Search/filter correctness tests.
- UI tests for portfolio search states.
- Tenant-aware read tests.

**Definition of done**
- A trusted operator can find and inspect domains across the portfolio from one place.
