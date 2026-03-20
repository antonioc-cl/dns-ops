# Bead 03 — Shared contracts and core supported schema

**Purpose**
Establish one reusable contract layer for requests, domain normalization, and core persisted entities.

**Prerequisites**
Bead 02.

**Concrete change**
Define the smallest supported product schema and shared API contract layer:
- shared request/response DTOs for collection and lookup flows,
- DTO reservations for later remediation/governed write paths without activating them early,
- one shared domain normalization/validation implementation,
- core schema only for:
  - `Domain`,
  - `Snapshot`,
  - `Observation`,
  - `RecordSet`,
  - `RulesetVersion`,
  - later persisted evaluation artifacts,
- snapshot scope persisted explicitly.

**Invariants**
- Domain normalization may not diverge between web and collector.
- Core schema means “actively supported now,” not “maybe used later.”
- Raw observations remain append-only.

**Validation / tests**
- Round-trip tests for shared contracts.
- Domain normalization tests including IDN/punycode cases.
- Migration test from empty DB.
- Scope integrity test: a snapshot cannot exist without explicit scope metadata.

**Definition of done**
- Web, collector, and packages speak the same request and domain language.
