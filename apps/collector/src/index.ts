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

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { assertEnvValid, getEnvConfig } from './config/env.js';
import { collectDomainRoutes } from './jobs/collect-domain.js';
import { collectMailRoutes } from './jobs/collect-mail.js';
import { fleetReportRoutes } from './jobs/fleet-report.js';
import { monitoringRoutes } from './jobs/monitoring.js';
import { probeRoutes } from './jobs/probe-routes.js';
import { closeQueues, getQueueHealth } from './jobs/queue.js';
import { startWorkers, stopWorkers, workersRunning } from './jobs/worker.js';
import { dbMiddleware, requireServiceAuthMiddleware } from './middleware/index.js';
import type { Env } from './types.js';

// Validate environment at startup (fail fast with clear messages)
assertEnvValid();

const app = new Hono<Env>();

// Global middleware
app.use('*', cors());
app.use('*', logger());

// Database middleware - attaches DB adapter to context for all routes
// Requires DATABASE_URL environment variable
app.use('*', dbMiddleware);

// Service auth middleware - protects all routes by default
// Requires INTERNAL_SECRET, API_KEY_SECRET, or dev headers
app.use('*', requireServiceAuthMiddleware);

// =============================================================================
// Health & Readiness Endpoints
// =============================================================================

/**
 * Liveness probe - checks if the process is alive and responding.
 * Kubernetes uses this to determine if the container should be restarted.
 * Should be fast and not check external dependencies.
 */
app.get('/healthz', (c) => {
  return c.json({
    status: 'ok',
    service: 'dns-ops-collector',
    timestamp: new Date().toISOString(),
  });
});

// Alias for backward compatibility
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'dns-ops-collector',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Readiness probe - checks if the service is ready to receive traffic.
 * Kubernetes uses this to determine if traffic should be routed.
 * Checks external dependencies (DB, queues, workers).
 */
app.get('/readyz', async (c) => {
  const checks: Record<string, { status: 'ok' | 'error'; message?: string }> = {};
  let allHealthy = true;

  // Check database connection
  try {
    const db = c.get('db');
    if (db) {
      // Check if DATABASE_URL is configured (db adapter initialized)
      checks['database'] = { status: 'ok' };
    } else {
      checks['database'] = { status: 'error', message: 'DB not initialized' };
      allHealthy = false;
    }
  } catch (err) {
    checks['database'] = {
      status: 'error',
      message: err instanceof Error ? err.message : 'Connection failed',
    };
    allHealthy = false;
  }

  // Check queue health if workers enabled
  if (process.env.WORKER_ENABLED === 'true') {
    const queueHealth = await getQueueHealth();

    // queueHealth.available indicates Redis connection
    checks['queues'] = queueHealth.available
      ? { status: 'ok' }
      : { status: 'error', message: 'Queue connection unavailable' };

    if (!queueHealth.available) allHealthy = false;

    checks['workers'] = workersRunning()
      ? { status: 'ok' }
      : { status: 'error', message: 'Workers not running' };

    if (!workersRunning()) allHealthy = false;
  }

  const status = allHealthy ? 200 : 503;

  return c.json(
    {
      status: allHealthy ? 'ready' : 'not_ready',
      service: 'dns-ops-collector',
      timestamp: new Date().toISOString(),
      checks,
    },
    status
  );
});

// Mount collection routes
app.route('/api/collect', collectDomainRoutes);
app.route('/api/collect', collectMailRoutes);

// Mount probe routes (Bead 10)
app.route('/api/probe', probeRoutes);

// Mount fleet report routes (Bead 11)
app.route('/api/fleet-report', fleetReportRoutes);

// Mount monitoring routes (Bead 15)
app.route('/api/monitoring', monitoringRoutes);

// 404 handler
app.notFound((c) => c.json({ error: 'Not Found' }, 404));

// Error handler
app.onError((err, c) => {
  console.error('Collector error:', err);
  return c.json(
    {
      error: 'Internal Server Error',
      message: err.message,
    },
    500
  );
});

// Start server
const { port } = getEnvConfig();

const server = serve(
  {
    fetch: app.fetch,
    port,
  },
  async (info) => {
    console.log(`🚀 DNS Ops Collector running on port ${info.port}`);
    console.log(`📊 Liveness: http://localhost:${info.port}/healthz`);
    console.log(`📊 Readiness: http://localhost:${info.port}/readyz`);

    // Start workers if enabled
    if (process.env.WORKER_ENABLED === 'true') {
      console.log('[Collector] Starting job queue workers...');
      await startWorkers();
    }
  }
);

// Graceful shutdown
async function shutdown(signal: string): Promise<void> {
  console.log(`\n[Collector] Received ${signal}, shutting down...`);

  // Stop workers first
  if (workersRunning()) {
    console.log('[Collector] Stopping workers...');
    await stopWorkers();
  }

  // Close queue connections
  console.log('[Collector] Closing queue connections...');
  await closeQueues();

  // Close HTTP server
  console.log('[Collector] Closing HTTP server...');
  server.close();

  console.log('[Collector] Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
