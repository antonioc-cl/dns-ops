# Bead 10 — DKIM selector provenance and provider detection

**Purpose**  
Separate basic mail evidence from higher-ambiguity selector heuristics.

**Prerequisites**  
Bead 09.

**Concrete change**  
Implement DKIM selector discovery as a first-class, labeled subsystem:
- selector precedence rules,
- provider detection,
- selector provenance,
- selector confidence,
- persisted selector metadata used by the API/UI.

**Invariants**
- Heuristic selector discovery must be visibly heuristic.
- Not finding a selector is not the same as proving DKIM is absent.
- The API may not reconstruct provenance by guesswork after the fact.

**Validation / tests**
- Tests for provider-specific selectors, multiple selectors, no selector, and confidence/provenance rendering.

**Definition of done**
- Users can see how selectors were discovered and how trustworthy that discovery is.
