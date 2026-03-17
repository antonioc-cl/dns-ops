# Bead 14 — Portfolio search, notes, and template management

**Purpose**  
Turn the workbench into a cross-domain operational multiplier.

**Prerequisites**  
Beads 11 and 13, plus a real inventory source.

**Concrete change**  
Build the first portfolio layer:
- Search/filter across domains and findings.
- Saved filters.
- Tags/notes per domain.
- Template override/edit surface for trusted operators.
- Tenant-aware permissions and audit logging.

**Invariants**
- Search results are inventory-scoped.
- Notes and template changes must be auditable.
- Internal permissions must be enforced before broader exposure.
- Template edits remain data-backed, not code-only.

**Validation / tests**
- Search and filter correctness tests.
- Permission tests for tenant/domain access.
- Audit-log tests for note and template changes.
- Template-override tests proving changes only affect intended scopes.

**Rollout or migration notes**
- Limit to trusted internal roles first.
- Do not open template editing broadly until auditability is proven.

**Rollback plan**
- Disable portfolio views and editing.
- Keep underlying data but stop exposing it.

**Definition of done**
- A trusted operator can find domains across the portfolio, annotate them, and adjust supported template expectations without code changes.
