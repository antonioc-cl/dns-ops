# Bead 04 — DNS collection and normalization pipeline

**Purpose**  
Create one trustworthy evidence pipeline for single-domain DNS state.

**Prerequisites**  
Bead 03.

**Concrete change**  
Implement the DNS collection path end-to-end:
- phase-1 DNS query planning,
- recursive collection,
- authoritative collection using a real authoritative strategy,
- observation persistence,
- `RecordSet` normalization,
- explicit result-state handling for timeout/refusal/truncation/NXDOMAIN/NODATA/error.

**Invariants**
- Every visible DNS conclusion must trace back to stored observations.
- Managed/unmanaged behavior must match the documented scope policy.
- Failure states are first-class, not swallowed.

**Validation / tests**
- Integration tests against controllable zones.
- Query-plan tests for managed vs unmanaged.
- Parsing/normalization tests for TXT, CNAME chains, wildcard, IDN, NXDOMAIN, NODATA.

**Definition of done**
- A domain refresh produces stored observations and normalized record sets that can be trusted.
