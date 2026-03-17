# Bead 07 — Rules engine core plus first DNS findings

**Purpose**  
Introduce deterministic, evidence-backed findings without waiting for the full mail stack.

**Prerequisites**  
Beads 01, 02, and 05.

**Concrete change**  
Implement the rules engine and first benchmark-backed rule pack:
- Rules engine reads normalized observations and emits:
  - `Finding`,
  - `Suggestion`,
  - severity,
  - confidence,
  - risk posture,
  - blast radius,
  - `review_only`.
- Initial DNS rules:
  - authoritative lookup failure/timeouts,
  - mismatch across authoritative servers for the same queried name/type,
  - recursive vs authoritative mismatch,
  - CNAME coexistence conflict,
  - explicit partial-coverage finding on unmanaged zones.
- Findings panel on Overview.

**Invariants**
- Findings must derive only from stored evidence.
- Rules are versioned.
- AI is not allowed to originate authoritative findings.
- Review-only must be set for anything with real blast radius.

**Validation / tests**
- Golden tests from the benchmark corpus.
- Evidence-link tests proving every finding can point back to concrete observations.
- Versioning tests proving the same snapshot can be re-evaluated under different ruleset versions.

**Rollout or migration notes**
- Ship findings as internal pilot only.
- Treat these as benchmark-backed, not exhaustive.

**Rollback plan**
- Disable rules evaluation and hide findings panel.
- Keep raw/parsed views intact.

**Definition of done**
- Operators see deterministic DNS findings with evidence links and versioned suggestions.
