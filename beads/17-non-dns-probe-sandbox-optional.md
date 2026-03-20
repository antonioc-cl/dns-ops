# Bead 17 — Non-DNS probe sandbox (optional)

**Purpose**
Enable safe active probing only after core mail evidence and governance are mature.

**Prerequisites**
Beads 01, 09–13.

**Concrete change**
Implement the optional probe subsystem:
- allowlist-derived targets only,
- hard-blocked internal/private destinations,
- separate execution surface and egress identity,
- probe outcomes persisted as observations,
- explicit operator-triggered execution first.

**Invariants**
- No arbitrary outbound probing.
- No production mail egress reuse.
- Probe outcomes stay read-only and explicitly scoped.

**Validation / tests**
- SSRF guard tests.
- Allow/deny tests.
- Rate-limit/concurrency/timeout tests.
- Security review.

**Definition of done**
- If enabled, probes are safe, bounded, and evidence-backed.
