# Bead 12 — Shadow comparison and parity evidence

**Purpose**  
Create the durable parity evidence path between workbench mail analysis and legacy tools.

**Prerequisites**  
Beads 08 and 11.

**Concrete change**  
Implement the read-mostly parity layer:
- durable legacy access logging,
- durable shadow comparison records,
- read-only mismatch reporting,
- narrow provider-template baseline pack,
- expected-vs-actual comparisons that survive process restart.

**Invariants**
- Shadow state must be durable, not process-local memory.
- Provider baselines are readable parity reference data here, not tenant-scoped edit surfaces.
- No cutover claim without persisted mismatch history.

**Validation / tests**
- Shadow persistence tests.
- Mismatch reporting tests.
- Expected-vs-actual accuracy tests for supported providers.

**Definition of done**
- The repo has durable parity evidence, not just preview language.

**Note on cutover**
Durable parity evidence here does **not** imply legacy mail cutover. Cutover requires persisted mismatch history plus an explicit adjudication threshold and human decision.
