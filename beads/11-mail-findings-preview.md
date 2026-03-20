# Bead 11 — Mail findings preview

**Purpose**  
Give users useful workbench mail analysis without prematurely declaring cutover.

**Prerequisites**  
Beads 09–10 and Bead 06 evaluation infrastructure.

**Concrete change**  
Implement persisted preview mail findings for:
- MX posture,
- Null MX posture,
- SPF present / malformed / absent,
- DMARC present / malformed / policy posture,
- DKIM key presence for discovered selectors,
- MTA-STS and TLS-RPT TXT presence,
- BIMI as info-only.

**Invariants**
- Preview findings are evidence-backed and persisted.
- Legacy tools remain authoritative until parity is explicitly achieved.
- High-risk suggestions remain review-only.

**Validation / tests**
- Golden tests for mail rules.
- UI tests for mail findings rendering in the Mail tab.
- Persistence tests using evaluation runs.

**Definition of done**
- Users can inspect useful workbench mail findings alongside legacy access.
