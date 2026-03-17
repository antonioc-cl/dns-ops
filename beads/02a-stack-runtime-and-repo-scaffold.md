# Bead 02A — Stack, runtime split, and repo scaffold

**Purpose**  
Make the implementation shape explicit so the team can scaffold once and avoid accidental architecture drift.

**Prerequisites**  
Beads 01–02.

**Concrete change**  
Adopt the chosen implementation stack and scaffold the monorepo.

### Chosen stack
- **App shell:** TanStack Start + Hono + TanStack Query + Tailwind + shadcn/ui
- **App runtime:** Cloudflare Workers
- **Database:** Postgres + Drizzle ORM
- **Collector / probe runtime:** separate Node.js worker service

### Repo scaffold
Create a monorepo with this high-level shape:
- `apps/web` — TanStack Start app shell deployed to Workers
- `apps/collector` — Node worker for DNS/mail/delegation collection and approved probes
- `packages/db` — shared Drizzle schema/client
- `packages/contracts` — shared types/enums/contracts
- `packages/rules` — deterministic rules engine and rule packs
- `packages/parsing` — DNS/mail parsing and dig formatting helpers
- `packages/testkit` — benchmark corpus, fixtures, golden tests
- `docs/` — memo, beads, rules notes, benchmark notes

Create the initial root workspace files:
- workspace config
- shared tsconfig
- formatting/linting config
- CI skeleton
- `wrangler` config for the web app
- Dockerfile for collector

**Invariants**
- The collector/probe runtime is a separate execution surface from the app shell.
- Non-DNS probes must not be forced into the Workers runtime.
- Contracts are shared from one package, not copied between apps.
- Rules remain deterministic TypeScript code, not an AI interpretation layer.

**Validation / tests**
- Workspace bootstraps successfully.
- `apps/web` and `apps/collector` both build.
- Shared packages type-check across both apps.
- Basic CI runs install, lint, and type-check.

**Rollout or migration notes**
- This bead is foundational and should happen before meaningful app code lands.
- It does not change legacy DMARC/DKIM tools.
- Keep the collector boundary even if early job execution is still minimal.

**Rollback plan**
- Revert scaffold commits if the workspace shape proves unworkable.
- Preserve shared contracts and DB schema work in separate commits where possible.

**Definition of done**
- The monorepo exists with the chosen app/runtime split.
- Both apps build.
- Shared packages are wired and importable.
- A recommended repo structure is committed in documentation.
