# Bead 09 — Mail rules, shadow comparison, and provider templates v1

**Purpose**  
Make mail diagnosis operationally useful while keeping cutover risk near zero.

**Prerequisites**  
Beads 06–08.

**Concrete change**  
Implement the first mail rules and shadow mode:
- Mail rules for:
  - MX present / absent,
  - Null MX posture,
  - SPF exists / malformed / absent,
  - DMARC exists / policy posture,
  - DKIM key presence for discovered selectors,
  - MTA-STS TXT presence,
  - TLS-RPT TXT presence,
  - BIMI as info-only unless ruleset support is justified.
- Shadow comparison of new DMARC/DKIM logic against legacy outputs.
- Narrow provider-template pack for top 3–5 providers actually used in the client base.
- Data-backed template storage so trusted internal operators can update expectations without app rewrites.

**Invariants**
- Legacy DMARC/DKIM outputs remain authoritative until the parity gate passes.
- High-risk suggestions remain review-only.
- Provider templates stay narrow and explicitly scoped.

**Validation / tests**
- Benchmark-based golden tests for mail rules.
- Shadow mismatch dashboard or report.
- Manual adjudication of every shadow mismatch before cutover.
- Template tests proving expected-vs-actual comparisons are accurate for supported providers.

**Rollout or migration notes**
- Present new mail findings as **preview** until parity is acceptable.
- Graduate checks one by one, not all at once.

**Rollback plan**
- Demote new mail findings back to preview-only or hide them entirely.
- Continue using legacy DMARC/DKIM surfaces.

**Definition of done**
- Operators can inspect useful mail findings in one place.
- Shadow comparison data exists and is stable enough to evaluate parity.
- At least one provider template produces a correct expected-vs-actual result on pilot domains.
