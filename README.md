# DNS Ops Workbench — Implementation Pack

This zip contains the implementation-ready beads derived from the approved planning memo, plus the added stack/scaffold bead for:
- TanStack Start
- Hono
- TanStack Query
- Tailwind + shadcn/ui
- Cloudflare Workers for the app shell
- Postgres + Drizzle
- Separate Node worker for collection/probing

## Files

- `IMPLEMENTATION_BEADS.md` — master document with all beads in dependency order
- `beads/` — one markdown file per bead
- `REPO_STRUCTURE.md` — recommended repo structure and architecture notes

## Build commitment boundary

Committed path:
- Beads `01`–`09`

Conditional path:
- Beads `10`–`16`

## Suggested first coding sequence

1. `01-pilot-corpus-status-trust-boundary.md`
2. `02-minimal-data-model-and-persistence-contract.md`
3. `02a-stack-runtime-and-repo-scaffold.md`
4. `03-dns-collection-worker-mvp.md`
5. `04-domain-360-shell.md`
6. `05-snapshot-read-path-and-views.md`
7. `06-legacy-dmarc-dkim-adapters.md`
8. `07-rules-engine-core-and-first-dns-findings.md`
9. `08-mail-collection-core-and-dkim-selector-strategy.md`
10. `09-mail-rules-shadow-comparison-provider-templates-v1.md`
