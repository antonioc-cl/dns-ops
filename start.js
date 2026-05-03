#!/usr/bin/env node
/**
 * Service launcher — selects the correct app based on RAILWAY_SERVICE_NAME
 */

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const serviceName = process.env.RAILWAY_SERVICE_NAME;
const isCollector = serviceName === 'dns-ops';

const candidates = isCollector
  ? [
      join(process.cwd(), 'apps/collector/dist/index.js'),
      join(process.cwd(), 'dist/index.js'),
    ]
  : [
      join(process.cwd(), 'apps/web/.output/server/index.mjs'),
      join(process.cwd(), '.output/server/index.mjs'),
    ];

for (const path of candidates) {
  if (existsSync(path)) {
    console.log(`[start.js] Launching ${isCollector ? 'collector' : 'web'} from ${path}`);
    import(path);
    process.exit(0);
  }
}

console.error(`[start.js] No entry point found for ${serviceName}`);
console.error('Searched:', candidates);
console.error('CWD:', process.cwd());
try {
  console.error('Files in CWD:', readdirSync(process.cwd()));
} catch (e) {
  console.error('Cannot read CWD:', e.message);
}
process.exit(1);
