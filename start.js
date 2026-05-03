#!/usr/bin/env node
/**
 * Service launcher — selects the correct app based on RAILWAY_SERVICE_NAME
 *
 * Why this file exists:
 * Railway's monorepo support requires both services to run from repo root
 * so workspace packages resolve during install. But each service needs a
 * different start command. Rather than fragile shell conditionals in
 * railway.toml, this small Node script does the dispatch cleanly.
 */

const serviceName = process.env.RAILWAY_SERVICE_NAME;

if (serviceName === 'dns-ops') {
  import('./apps/collector/dist/index.js');
} else {
  import('./apps/web/.output/server/index.mjs');
}
