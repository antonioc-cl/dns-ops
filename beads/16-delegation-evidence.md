# Bead 16 — Delegation evidence

**Purpose**  
Add deeper delegation and DNSSEC evidence only after the core single-domain product is trustworthy.

**Prerequisites**  
Beads 04–07.

**Concrete change**  
Extend collection and UI for delegation diagnostics:
- parent-zone delegation evidence,
- per-authoritative-server answers,
- glue evidence,
- DNSSEC validation-source metadata,
- delegation-specific issue rendering.

**Invariants**
- DNSSEC conclusions may not exceed what the validating source proves.
- Delegation evidence remains raw-evidence-backed and ambiguity-forward.
- Delegation is a depth feature, not a substitute for core DNS truth.

**Validation / tests**
- Tests for mismatched NS sets, lame delegation, glue variation, DNSSEC present/absent, and authoritative divergence.
- Integration tests for delegation routes/UI.

**Definition of done**
- Users can inspect delegation evidence without relying on placeholder behavior.
