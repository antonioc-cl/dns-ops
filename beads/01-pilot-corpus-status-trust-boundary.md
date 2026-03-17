# Bead 01 — Pilot corpus, status vocabulary, and trust boundary

**Purpose**  
Turn the memo into executable acceptance criteria and eliminate ambiguity before code starts.

**Prerequisites**  
None.

**Concrete change**  
Create the project’s baseline operational artifacts:
- Benchmark corpus of representative domains and cases:
  - known-good managed zones,
  - known-good unmanaged zones,
  - historical incident cases,
  - intentionally misconfigured test zones,
  - IDN/punycode case,
  - wildcard case,
  - NXDOMAIN case,
  - NODATA case,
  - stale-IP migration case.
- Shared enums and vocabulary:
  - result state: `complete | partial | failed`,
  - severity,
  - confidence,
  - risk posture,
  - blast radius,
  - `review_only`.
- Initial targeted-inspection scope for unmanaged zones:
  - phase-1 names and types to query,
  - how scope is displayed in the UI.
- Initial trust-boundary policy for non-DNS probes:
  - allowed probe types,
  - blocked address space,
  - egress restrictions,
  - timeout/concurrency limits.

**Invariants**
- Unmanaged zones must default to **partial** visibility.
- No artifact may imply full-zone enumeration for arbitrary third-party domains.
- Risky changes must be marked **review-only**.
- The rules engine will be authoritative, not AI summaries.

**Validation / tests**
- Review benchmark corpus against manual `dig`/authoritative checks.
- Confirm every benchmark case has a known expected outcome or explicit “ambiguous by design” label.
- Verify the status vocabulary covers every benchmark case without special-case wording.

**Rollout or migration notes**
- Internal-only artifact.
- This bead replaces informal expectations with a single source of truth for testing and acceptance.

**Rollback plan**
- Revert the artifacts in version control.
- Keep prior benchmark items archived, not deleted, so test history remains explainable.

**Definition of done**
- Benchmark corpus exists in the repo.
- Status/risk/blast-radius vocabulary is committed and referenced by later beads.
- Initial query scope and probe policy are agreed and documented.
