# DNS Ops Workbench — Implementation Pack

This repo contains the implementation planning artifacts for DNS Ops Workbench.

## Primary planning source of truth

- `IMPLEMENTATION_BEADS.md` — **authoritative revised bead plan**

## Important note about split bead files

The files under `beads/` still reflect the older v1 bead graph.
They are useful as historical context, but they are **not** the current source of truth until regenerated from `IMPLEMENTATION_BEADS.md`.

## Supporting files

- `beads/` — legacy per-bead markdown files from the older plan
- `REPO_STRUCTURE.md` — recommended repo structure and architecture notes
- `docs/rules/query-scope.md` — DNS scope policy
- `docs/rules/trust-boundary.md` — non-DNS probe trust-boundary policy

## Recommended execution order

1. `00` — Workspace validation baseline
2. `01` — Pilot corpus, status vocabulary, query scope, and trust boundary
3. `02` — Authoritative runtime topology and scaffold
4. `03` — Shared contracts and core supported schema
5. `04` — DNS collection and normalization pipeline
6. `05` — Single-domain evidence viewer
7. `06` — Ruleset registry and persisted DNS findings
8. `07` — Snapshot history and diff
9. `08` — Legacy mail bridge
10. `09` — Mail evidence core
11. `10` — DKIM selector provenance and provider detection
12. `11` — Mail findings preview
13. `12` — Shadow comparison and parity evidence
14. `13` — Auth, actor, tenant, and write-path governance
15. `18` — Batch findings report
16. `14` — Portfolio search and read models
17. `15` — Portfolio writes, notes, tags, overrides, adjudication, and audit log
18. `16` — Delegation evidence
19. `17` — Non-DNS probe sandbox (optional)
20. `19` — Job orchestration and scheduled refresh
21. `20` — Alerts and shared reports

## Frozen ahead-of-plan surfaces

These code paths already exist in the repo, but they are not proof of completed beads and should be treated as frozen/experimental until their owning revised bead lands:
- `apps/web/hono/routes/mail.ts`
- `apps/web/hono/routes/portfolio.ts`
- `apps/web/hono/routes/shadow-comparison.ts`
- `apps/web/hono/routes/provider-templates.ts`
- `apps/collector/src/jobs/fleet-report.ts`
- `apps/collector/src/jobs/monitoring.ts`
- `apps/collector/src/jobs/probe-routes.ts`
- `apps/web/app/routes/domain/$domain.tsx`
- `apps/web/app/components/mail/MailDiagnostics.tsx`
- `apps/web/app/components/mail/RemediationForm.tsx`
- `apps/web/app/components/DiscoveredSelectors.tsx`
- `apps/web/app/components/DelegationPanel.tsx`
- `apps/collector/src/index.ts`
- `STATUS_REPORT.md` (non-authoritative; stale until rewritten)

## Recommended stopping points

- After `05`: first trustworthy single-domain evidence product
- After `06`: persisted DNS findings
- After `07`: strong history/diff workflow
- After `11`: first useful workbench mail preview
- After `12`: durable mail parity evidence program (not legacy cutover by itself)
- After `14`: first safe portfolio read value
- After `18`: actionable batch fleet reporting
- After `20`: proactive operations platform
