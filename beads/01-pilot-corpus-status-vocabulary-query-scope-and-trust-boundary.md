# Bead 01 — Pilot corpus, status vocabulary, query scope, and trust boundary

**Purpose**
Turn product intent into executable policy before more product code lands.

**Prerequisites**
Bead 00.

**Concrete change**
Maintain the planning artifacts that define what the product is allowed to claim:
- benchmark corpus of representative domains and failure cases,
- shared result/risk/confidence vocabulary,
- explicit phase-1 DNS query scope,
- trust-boundary policy for later non-DNS probes.

**Invariants**
- Unmanaged zones default to `partial` visibility.
- No document may imply whole-zone visibility for arbitrary third-party domains.
- Probe policy stays doc-backed and explicit before any network probing expands.

**Validation / tests**
- Corpus reviewed against manual evidence.
- Scope and vocabulary referenced by code-facing contracts.
- Trust-boundary doc remains aligned with actual probe behavior.

**Definition of done**
- Query scope and trust claims are explicit, versioned, and reusable by later beads.
