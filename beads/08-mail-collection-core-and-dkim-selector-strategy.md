# Bead 08 — Mail collection core plus DKIM selector strategy

**Purpose**  
Bring mail evidence into the same evidence model and resolve the selector-discovery ambiguity explicitly.

**Prerequisites**  
Beads 03, 05, and 06.

**Concrete change**  
Extend collection and normalization for mail-related checks:
- Collect and store observations for:
  - `MX`,
  - SPF-bearing TXT,
  - `_dmarc`,
  - candidate DKIM selectors,
  - `_mta-sts`,
  - `_smtp._tls`,
  - Null MX detection.
- Implement explicit selector-discovery precedence:
  1. managed-zone configured selectors if available,
  2. operator-supplied selectors if present,
  3. provider-specific heuristics for the narrow supported set,
  4. limited common-selector dictionary,
  5. no selector found → `partial`, not automatic failure.
- Record selector provenance and confidence.

**Invariants**
- Heuristic selector discovery must be labeled as heuristic.
- Absence of a discovered selector is not the same as absence of DKIM.
- Legacy DMARC/DKIM tools remain authoritative until parity is proven.

**Validation / tests**
- Cases for:
  - Google/Microsoft/common provider selectors,
  - multiple selectors,
  - no selector discovered,
  - Null MX,
  - SPF TXT parsing.
- Ensure selector provenance is rendered and stored.

**Rollout or migration notes**
- Start with a narrow set of providers actually seen in the client base.
- Keep legacy tools visible during the transition.

**Rollback plan**
- Disable new mail collection paths.
- Keep adapters and raw DNS views intact.

**Definition of done**
- Mail-related observations are collected, stored, and rendered with explicit selector provenance.
