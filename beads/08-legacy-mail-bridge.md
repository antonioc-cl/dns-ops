# Bead 08 — Legacy mail bridge

**Purpose**  
Keep trusted legacy DMARC/DKIM workflows reachable without pretending parity exists.

**Prerequisites**  
Bead 05.

**Concrete change**  
Implement the bridge only:
- Domain 360 mail tab links to trusted legacy mail tools,
- domain context is pre-filled,
- return path back to Domain 360 works,
- access can be logged once durable logging exists.

**Invariants**
- Legacy outputs remain authoritative.
- The bridge does not claim workbench parity.
- Placeholder URLs must never be presented as real production integrations.

**Validation / tests**
- Smoke tests for deep links and return path.
- Config tests for legacy tool URL presence.
- Auth/session tests if legacy tools are protected.

**Definition of done**
- Users can move from Domain 360 to legacy mail tools without losing context.
