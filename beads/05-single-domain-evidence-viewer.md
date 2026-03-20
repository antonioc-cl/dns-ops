# Bead 05 — Single-domain evidence viewer

**Purpose**  
Deliver the first complete user value: a truthful Domain 360 for DNS evidence.

**Prerequisites**  
Bead 04.

**Concrete change**  
Merge the old shell/read-path intent into one backed viewer:
- domain lookup and normalization,
- Domain 360 page with only backed tabs/views,
- raw / parsed / dig-style DNS views,
- snapshot metadata and explicit query scope,
- refresh flow with correct loading/error states,
- visible managed/unmanaged and complete/partial/failed labeling.

**Invariants**
- The UI may not present placeholder product areas as implemented workflows.
- Raw evidence remains discoverable with minimal friction.
- Scope warnings are prominent for unmanaged zones.

**Validation / tests**
- UI tests for domain input, IDN, status badges, scope labeling, and empty/error states.
- Smoke test: user enters domain, triggers refresh, lands on evidence viewer.

**Definition of done**
- A user can trust what the Domain 360 page shows and what it does not claim.
