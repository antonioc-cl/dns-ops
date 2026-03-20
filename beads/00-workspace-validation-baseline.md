# Bead 00 — Workspace validation baseline

**Purpose**  
Make the repo truthful before more implementation lands.

**Prerequisites**  
None.

**Concrete change**  
Create a reliable validation contract for the monorepo:
- all workspaces expose real `build`, `typecheck`, `lint`, and `test` scripts,
- root `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm test` execute real work,
- generated artifacts are excluded from source test execution,
- CI skeleton actually runs the same commands developers use locally.

**Invariants**
- A green root test command must mean real source tests passed.
- Build artifacts must not create false-green or duplicate test execution.
- Status docs may not claim completeness against red validation.

**Validation / tests**
- Run root validation commands successfully.
- Confirm source tests run without `dist` duplicates.
- Confirm CI config matches local validation sequence.

**Definition of done**
- The repo can honestly say whether it is green or red.
