# Bead 13 — Auth, actor, tenant, and write-path governance

**Purpose**  
Prevent fake auditability and fake multi-tenancy before more operator write surfaces land.

**Prerequisites**  
Beads 02–03.

**Concrete change**  
Add real request identity and route governance:
- auth middleware,
- actor/tenant context population,
- protected write routes,
- removal of silent `default` / `unknown` write ownership,
- explicit internal-only behavior where public auth is not ready yet.

**Invariants**
- Persistent writes require real actor/tenant context.
- Route protection must exist before portfolio writes, monitoring writes, or template editing expand.
- Shared reports and operator state may not leak across tenants.

**Validation / tests**
- Route-level auth/authz tests.
- Tenant-isolation tests.
- Input validation tests on critical mutating routes.

**Definition of done**
- The system can truthfully claim who wrote what and for which tenant.
