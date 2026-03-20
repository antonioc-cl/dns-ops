# Bead 09 — Mail evidence core

**Purpose**  
Bring mail evidence into the same persisted evidence model as DNS.

**Prerequisites**  
Beads 04 and 08.

**Concrete change**  
Extend collection and storage for mail-relevant evidence:
- `MX`,
- SPF-bearing TXT,
- `_dmarc`,
- `_mta-sts`,
- `_smtp._tls`,
- Null MX posture,
- snapshot-backed mail observations through the same core persistence path.

**Invariants**
- Mail evidence is snapshot-backed, not a parallel ephemeral truth system.
- Absence of observed mail evidence is not over-interpreted beyond collected scope.
- Mail collection reuses shared domain/request contracts.

**Validation / tests**
- Integration tests for mail observation persistence.
- Cases for Null MX, SPF-bearing TXT, DMARC presence/absence, and probe-adjacent TXT records.

**Definition of done**
- Mail evidence is stored and inspectable through the same evidence model as DNS.
