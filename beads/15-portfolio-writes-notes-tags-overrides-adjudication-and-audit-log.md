# Bead 15 — Portfolio writes, notes, tags, overrides, adjudication, and audit log

**Purpose**
Add operator memory and controlled write workflows after auth exists.

**Prerequisites**
Beads 12–14.

**Concrete change**
Implement write-enabled operator workflows:
- notes,
- tags,
- saved filter writes,
- tenant-scoped template override management,
- shadow comparison adjudication,
- audit log visibility.

**Invariants**
- Every write is actor-attributed and auditable.
- Template changes affect only intended tenant/domain scope.
- Adjudication is a governed operator write, not an anonymous parity side effect.
- Write workflows do not precede auth governance.

**Validation / tests**
- CRUD tests for notes/tags/filters/overrides.
- Adjudication tests.
- Audit-log tests.
- Permission tests for cross-tenant access.

**Definition of done**
- Operators can safely annotate, adjudicate, and tune portfolio behavior with durable auditability.
