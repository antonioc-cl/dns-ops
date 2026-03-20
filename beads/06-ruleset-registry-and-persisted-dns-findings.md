# Bead 06 — Ruleset registry and persisted DNS findings

**Purpose**  
Make deterministic analysis durable instead of request-local.

**Prerequisites**  
Bead 05.

**Concrete change**  
Introduce stored evaluation runs and DNS findings:
- ruleset registry used at runtime,
- persisted evaluation-run boundary per snapshot + ruleset version,
- deterministic DNS findings and suggestions stored in DB,
- overview findings panel reads stored results by default.

**Invariants**
- Findings derive only from stored evidence.
- Re-evaluation creates versioned analysis context, not silent overwrite.
- UI read paths do not depend on ephemeral inline analysis.

**Validation / tests**
- Golden tests against benchmark corpus.
- Evidence-link tests for every finding.
- Versioning tests proving a snapshot can be re-evaluated under a new ruleset.
- Persistence tests for evaluation runs/findings/suggestions.

**Definition of done**
- DNS findings are deterministic, persisted, and version-aware.
