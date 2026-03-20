# Session Closeout — 2026-03-19 — PostCSS Fix + API Wiring Investigation

## 1) TL;DR

- Created missing `apps/web/postcss.config.js` — the only change needed to make Tailwind CSS render.
- Confirmed Tailwind works in incognito; regular Chrome needed cache cleared (stale CSS cached).
- Discovered that all Hono API routes (`hono/routes/api.ts`) are **never mounted** — dead code.
- The `POST /api/collect/domain` (Refresh button) fails because Hono is not wired into Vinxi.
- SSR loaders also use relative `fetch('/api/...')` URLs which fail server-side — secondary issue.
- Began researching TanStack Start `createStartAPIHandler` as the correct integration point.

---

## 2) Goals vs Outcome

**Planned goals**

- Fix unstyled website (missing PostCSS config).
- Verify fix visually via dev server.

**What actually happened**

- PostCSS fix applied and verified — styles render.
- Discovered deeper issue: API routes (Hono) never connected to Vinxi dev server.
- Research into TanStack Start v1.120 API mounting was interrupted before a fix was implemented.

---

## 3) Key decisions (with rationale)

- **Decision:** Create `postcss.config.js` as a standalone file (not via CLI).
  - **Why:** It's a simple static config; no generator needed. Content is standard Tailwind+Autoprefixer.
  - **Tradeoff:** Acceptable one-off exception to CLI-primacy rule.
  - **Status:** confirmed

- **Decision:** Hono API routes need `createStartAPIHandler` wrapper, not a separate Express/Node server.
  - **Why:** TanStack Start v1.120 ships `@tanstack/start-api-routes` with `createStartAPIHandler` that wraps a `(req) => Response` handler as an H3 event handler. Hono accepts `Request` and returns `Response` — compatible.
  - **Tradeoff:** Requires creating `app/api.ts` entry file.
  - **Status:** tentative (not yet implemented)

---

## 4) Work completed (concrete)

- **Created:** `apps/web/postcss.config.js`
- **Dev server started** and confirmed running (`node` on `:3000`, collector on `:3001`).
- Identified root cause of non-functional "Refresh" button on domain pages.

---

## 5) Changes summary

- **Added:** `apps/web/postcss.config.js` — PostCSS config with `tailwindcss` + `autoprefixer` plugins.
- **Changed:** Nothing else was modified in this session (tracked file diffs in `git status` are from a prior session, not this one).
- **Behavioral impact:** Tailwind CSS now expands in the dev build. Visual layout renders correctly.
- **Migration/rollout notes:** None. Single-file addition; safe to commit as-is.

---

## 6) Open items / Next steps (actionable)

- **Task:** Mount Hono routes into TanStack Start via `createStartAPIHandler`.
  - **Owner:** agent
  - **Priority:** P0
  - **Suggested approach:**
    1. Create `apps/web/app/api.ts`:
       ```ts
       import { createStartAPIHandler } from '@tanstack/react-start/api';
       import { Hono } from 'hono';
       import { apiRoutes } from '../hono/routes/api.js';
       import { dbMiddleware } from '../hono/middleware/db.js';

       const app = new Hono();
       app.use('*', dbMiddleware);
       app.route('/api', apiRoutes);

       export default createStartAPIHandler(({ request }) => app.fetch(request));
       ```
    2. Vinxi will auto-detect `app/api.ts` as the API handler and serve it alongside SSR.
    3. Verify `POST /api/collect/domain` works from the browser.
  - **Blockers/Dependencies:** DB middleware uses `c.env.DB` (Cloudflare D1). In local dev, DB is PostgreSQL via `@dns-ops/db`. Need to check how `dbMiddleware` resolves the adapter for local dev vs. D1.

- **Task:** Fix SSR loader relative URL fetch (`fetch('/api/...')` in route loaders).
  - **Owner:** agent
  - **Priority:** P1
  - **Suggested approach:** TanStack Start loaders run both server-side and client-side. On the server, relative URLs fail. Options:
    - Use `createServerFn` to bypass HTTP and call DB directly.
    - Detect server context and prepend `http://localhost:3000`.
    - Use TanStack Start's built-in `getServerContext` or `useServerFn` pattern.
  - **Blockers/Dependencies:** Depends on P0 (Hono mounted) to test end-to-end.

- **Task:** Commit `postcss.config.js`.
  - **Owner:** user
  - **Priority:** P1
  - **Suggested approach:** `git add apps/web/postcss.config.js && git commit -m "fix(web): add postcss config to enable tailwind css"`

- **Task:** Add `notFoundComponent` to `__root.tsx`.
  - **Owner:** agent
  - **Priority:** P2
  - **Suggested approach:** Add `notFoundComponent: () => <div>Page not found</div>` to `createRootRoute({...})`.

---

## 7) Risks & gotchas

- **DB middleware mismatch (HIGH):** `hono/middleware/db.ts` uses `drizzle(c.env.DB, ...)` which expects a Cloudflare D1 binding. In local dev there is no `c.env.DB`. The local stack uses PostgreSQL via `@dns-ops/db`. The middleware will fail at runtime locally unless a local D1 shim or alternative adapter path is added.
- **Hono version:** Project uses `hono@^3.12.0`. `createStartAPIHandler` expects `(req: Request) => Response | Promise<Response>`. Hono's `.fetch(request, env, ctx)` signature includes `env` and `ctx` — pass `{}` for those in the local adapter.
- **`notFoundComponent` spam:** The `__root__` route is emitting repeated warnings in the server log. Not breaking but noisy.

---

## 8) Testing & verification

**Verified:**
- `lsof -i :3000` — two node processes listening, server alive.
- Styles render in incognito (Tailwind working post-fix).
- Regular Chrome needed cache clear (stale CSS).

**Not tested:**
- `POST /api/collect/domain` — fails (Hono not mounted).
- Any API route.
- SSR loader behavior with absolute vs. relative URLs.

**Suggested test plan for next session:**
```bash
# After mounting Hono:
curl -s http://localhost:3000/api/health | jq .
curl -s -X POST http://localhost:3000/api/collect/domain \
  -H 'Content-Type: application/json' \
  -d '{"domain":"google.com","zoneManagement":"unmanaged"}' | jq .
# Then navigate to /domain/google.com in browser and click Refresh
```

---

## 9) Notes for the next agent

**If you only read one thing:** The Hono API routes in `apps/web/hono/routes/api.ts` export `apiRoutes` but nothing imports or mounts them. `POST /api/collect/domain` (the Refresh button on domain pages) and all other API calls return 404 or fail. Fix: create `apps/web/app/api.ts` using `createStartAPIHandler` from `@tanstack/react-start/api`.

**Where to start:**
- `apps/web/hono/routes/api.ts` — the Hono router (complete, just not mounted)
- `apps/web/hono/middleware/db.ts` — DB middleware (uses D1, needs local dev adaptation)
- `apps/web/app/routes/domain/$domain.tsx:97` — `handleRefresh` calls `POST /api/collect/domain`
- `apps/web/app/routes/domain/$domain.tsx:14` — SSR loader uses relative `fetch('/api/...')`

**Key fact about the package:** `@tanstack/start-api-routes` v1.120.19 is installed. Its `createStartAPIHandler` takes a `(ctx: { request: Request }) => Response | Promise<Response>` callback. Hono's `app.fetch(request)` returns `Promise<Response>`. These are directly compatible.

**Local DB situation:** The collector service at `:3001` uses PostgreSQL. The web app's Hono middleware uses D1 (Cloudflare binding). For local dev, the API proxy route (`POST /api/collect/domain`) works by forwarding to the collector — it does NOT need D1 directly. So the collect flow may work without fixing the DB middleware, as long as the Hono app is mounted.
