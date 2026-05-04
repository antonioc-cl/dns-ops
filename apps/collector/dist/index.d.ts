/**
 * DNS Ops Collector Worker
 *
 * Node.js service for DNS collection and mail probing.
 * Runs as a separate service from the web app for isolation.
 *
 * ## Job Queue Mode
 * Set WORKER_ENABLED=true to start BullMQ workers for async job processing.
 * Requires REDIS_URL for job queue connectivity.
 */
import { Hono } from 'hono';
import type { Env } from './types.js';
declare const app: Hono<Env, {}, "/">;
export default app;
//# sourceMappingURL=index.d.ts.map