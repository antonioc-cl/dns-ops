# Bead 06 — Legacy DMARC/DKIM adapters

**Purpose**  
Preserve current trust and unify workflow without blocking the MVP on reimplementation.

**Prerequisites**  
Bead 04.

**Concrete change**  
Integrate the existing DMARC and DKIM tools into the new surface:
- Mail tab contains:
  - deep links or embedded panels to current tools,
  - domain context pre-filled,
  - return path back to Domain 360.
- Log access and domain context for later shadow-comparison analysis.

**Invariants**
- Legacy DMARC/DKIM outputs remain authoritative.
- New UI must not reinterpret or override legacy results yet.
- No changes to legacy tool internals are required in this bead.

**Validation / tests**
- Smoke tests for link/embed behavior.
- Auth/session tests if the tools are protected.
- Ensure domain context is preserved and accurate.

**Rollout or migration notes**
- Internal-only.
- This is a bridge, not the target architecture.

**Rollback plan**
- Remove adapters from the workbench.
- Keep legacy tools reachable directly as before.

**Definition of done**
- An operator can move from Domain 360 to the existing DMARC/DKIM tool surfaces in one step and back again.
