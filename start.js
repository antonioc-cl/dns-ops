#!/usr/bin/env node
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const serviceName = process.env.RAILWAY_SERVICE_NAME;
const isCollector = serviceName === 'dns-ops';
const cwd = process.cwd();

// Check specific paths
const paths = {
  appsDir: join(cwd, 'apps'),
  webOutput: join(cwd, 'apps/web/.output/server/index.mjs'),
  webOutputAlt: join(cwd, '.output/server/index.mjs'),
  collectorDist: join(cwd, 'apps/collector/dist/index.js'),
  collectorDistAlt: join(cwd, 'dist/index.js'),
};

for (const [name, path] of Object.entries(paths)) {
  console.log(`[start.js] ${name}: ${existsSync(path) ? 'EXISTS' : 'MISSING'} (${path})`);
}

// List apps dir if it exists
if (existsSync(paths.appsDir)) {
  const appsContents = readdirSync(paths.appsDir);
  console.log(`[start.js] apps/ contents: ${appsContents.join(', ')}`);
} else {
  console.log('[start.js] apps/ dir is MISSING');
}

const target = isCollector
  ? (existsSync(paths.collectorDist) ? paths.collectorDist : paths.collectorDistAlt)
  : (existsSync(paths.webOutput) ? paths.webOutput : paths.webOutputAlt);

if (existsSync(target)) {
  console.log(`[start.js] Launching ${isCollector ? 'collector' : 'web'} from ${target}`);
  import(target);
} else {
  console.error(`[start.js] FATAL: No entry point for ${serviceName}. Target: ${target}`);
  process.exit(1);
}
