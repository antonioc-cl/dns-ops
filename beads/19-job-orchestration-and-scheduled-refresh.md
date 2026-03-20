# Bead 19 — Job orchestration and scheduled refresh

**Purpose**
Add async execution truth before alerting and broader automation.

**Prerequisites**
Beads 04, 06, 11, 13, and 18.

**Concrete change**
Introduce explicit job orchestration:
- queued collection/evaluation jobs,
- idempotent scheduling,
- retry/cancellation/error state tracking,
- narrow scheduled refresh for monitored domains.

**Invariants**
- Background execution must be observable and idempotent.
- Scheduled refresh starts narrow and opt-in.
- Jobs may not hide failures behind silent retries.

**Validation / tests**
- Queue/idempotency tests.
- Scheduler tests.
- Retry and cancellation tests.

**Definition of done**
- The repo has a trustworthy async execution model instead of scattered inline loops.
