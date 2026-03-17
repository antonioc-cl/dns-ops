# Bead 10 — Non-DNS probe sandbox

**Purpose**  
Enable safe MTA-STS/SMTP/TLS checks only if the project decides they are worth the extra operational complexity.

**Prerequisites**  
Beads 01, 02, and 08.

**Concrete change**  
Implement a separate probe execution path:
- Separate worker pool and separate egress IP space from production mail systems.
- Allowlist probe destinations derived from DNS results only.
- Hard-block:
  - private/internal address space,
  - loopback,
  - link-local,
  - arbitrary user-specified endpoints.
- Support initial explicit-action probes for:
  - MTA-STS policy fetch,
  - limited SMTP STARTTLS capability check.
- Store probe outcomes as observations with distinct source type.

**Invariants**
- Non-DNS probes must never run from production mail egress.
- No arbitrary outbound probing.
- Strict timeouts and concurrency limits.
- Probes remain read-only.

**Validation / tests**
- SSRF guard tests.
- Network allow/deny tests.
- Timeouts and concurrency tests.
- Security review on worker isolation and egress policy.

**Rollout or migration notes**
- Disabled by default.
- Start with operator-triggered probing only.
- Do not schedule probes automatically at first.

**Rollback plan**
- Disable probe workers and hide probe-derived findings.
- Keep DNS-only mail analysis available.

**Definition of done**
- Approved non-DNS probes can run safely and produce observations without violating the trust boundary.
