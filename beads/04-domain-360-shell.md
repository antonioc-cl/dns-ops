# Bead 04 — Domain 360 shell

**Purpose**  
Give operators a usable entry point fast, even before deeper rules and mail logic land.

**Prerequisites**  
Beads 01–02A.

**Concrete change**  
Build the first UI shell:
- Domain lookup input and normalized domain handling.
- Domain 360 page with:
  - Overview tab,
  - DNS tab,
  - Mail tab placeholder,
  - Delegation tab placeholder,
  - History tab placeholder.
- Status badges:
  - `managed` / `unmanaged`,
  - `complete` / `partial` / `failed`.
- Snapshot refresh action.
- Explicit scope label showing that unmanaged zones are targeted inspection only.

**Invariants**
- The UI must not imply completeness for unmanaged zones.
- Raw evidence must remain discoverable with minimal friction.
- Internal-only access.

**Validation / tests**
- UI tests for:
  - domain normalization,
  - IDN input,
  - state badge rendering,
  - empty/error states.
- Smoke tests that the shell can load a snapshot or a “not yet collected” state cleanly.

**Rollout or migration notes**
- Feature-flagged for internal pilot users only.
- No cutover impact on legacy tools.

**Rollback plan**
- Disable the route or feature flag.
- Keep the backend untouched.

**Definition of done**
- An operator can enter a domain, trigger collection, and land on a stable page that clearly shows scope and state.
