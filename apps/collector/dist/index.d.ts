/**
 * DNS Ops Collector Worker
 *
 * Node.js service for DNS collection and mail probing.
 * Runs as a separate service from the web app for isolation.
 */
import { Hono } from 'hono';
declare const app: Hono<import("hono").Env, {}, "/">;
export default app;
//# sourceMappingURL=index.d.ts.map