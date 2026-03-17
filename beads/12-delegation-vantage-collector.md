# Bead 12 — Delegation vantage collector

**Purpose**  
Add the evidence required for parent/authoritative/resolver delegation diagnosis.

**Prerequisites**  
Beads 02, 03, 05, and 07.

**Concrete change**  
Extend collection for delegation diagnostics:
- Add parent-zone delegation view.
- Store per-authoritative-server answers and inconsistencies.
- Capture glue-related data where available.
- Capture basic DNSSEC-related observation fields and validation source identity when present.
- Record which authoritative server returned what.

**Invariants**
- DNSSEC conclusions must not be overstated beyond the validating source.
- Raw delegation evidence remains immutable.
- Ambiguity must be surfaced, not smoothed over.

**Validation / tests**
- Test zones for:
  - mismatched NS sets,
  - lame delegation,
  - glue variation,
  - DNSSEC present/absent,
  - per-authoritative divergence.
- Ensure findings point back to the correct parent/authoritative source.

**Rollout or migration notes**
- Feature-flag the data collection before exposing UI findings.
- Keep this separate from phase-1 DNS rules until stable.

**Rollback plan**
- Disable delegation collection and hide related UI.
- Preserve stored delegation observations for analysis.

**Definition of done**
- Snapshots include parent, authoritative, and delegation evidence for benchmark domains.
