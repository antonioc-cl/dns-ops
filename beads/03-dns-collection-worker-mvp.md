# Bead 03 — DNS collection worker MVP

**Purpose**  
Collect raw DNS evidence for the first usable product slice.

**Prerequisites**  
Beads 01–02A.

**Concrete change**  
Implement the worker/service that performs targeted DNS collection:
- Query supported phase-1 types:
  - `A`, `AAAA`, `CNAME`, `MX`, `TXT`, `NS`, `SOA`, `CAA`.
- Query the initial unmanaged-zone targeted names from Bead 01.
- Collect from at least:
  - one public recursive vantage,
  - the authoritative nameserver set.
- Store:
  - query name/type,
  - resolver or nameserver identity,
  - source type,
  - region/network identity where available,
  - transport,
  - response code,
  - flags,
  - TTLs,
  - answer/authority/additional sections,
  - timeout/refusal/truncation errors.
- Create snapshots on demand from the UI or internal API.

**Invariants**
- Read-only behavior only.
- No background scanning yet.
- Partial, timeout, refusal, and error states are first-class outputs.
- No claim of full-zone coverage for unmanaged zones.

**Validation / tests**
- Integration tests against controllable test zones.
- Cases for:
  - authoritative success,
  - recursive success,
  - timeout,
  - refusal,
  - truncation,
  - divergent answers across vantages,
  - empty answer vs NXDOMAIN.
- Load tests for safe concurrency and timeout handling.

**Rollout or migration notes**
- Start as an internal-only endpoint or worker queue.
- Do not connect it to any scheduled refresh yet.

**Rollback plan**
- Disable the worker route/queue.
- Keep previously stored observations for debugging.
- Fall back to no live collection rather than degraded collection.

**Definition of done**
- A requested domain produces stored observations for supported types from required DNS vantages.
- Failure states are stored and visible, not swallowed.
