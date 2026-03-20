# Bead 02 — Authoritative runtime topology and scaffold

**Purpose**  
Resolve the storage/runtime topology before the repo grows further.

**Prerequisites**  
Beads 00–01.

**Concrete change**  
Finalize the implementation shape:
- one authoritative production persistence topology,
- one clear web runtime contract,
- one clear collector runtime contract,
- monorepo scaffold aligned to that choice,
- env matrix for local/dev/prod.

**Invariants**
- Product state may not silently drift across incompatible backing stores.
- Web and collector must agree on where authoritative state lives.
- Runtime fallbacks must fail explicitly, not mask topology mistakes.

**Validation / tests**
- Web and collector build against the chosen topology.
- Startup config validation catches missing or impossible env combinations.
- Local and production-mode smoke paths use the same truth model.

**Definition of done**
- There is no architectural ambiguity about where product data lives.
