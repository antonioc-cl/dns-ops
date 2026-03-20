/**
 * DNS Ops Collector Worker
 *
 * Node.js service for DNS collection and mail probing.
 * Runs as a separate service from the web app for isolation.
 */
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { collectDomainRoutes } from './jobs/collect-domain.js';
import { collectMailRoutes } from './jobs/collect-mail.js';
import { fleetReportRoutes } from './jobs/fleet-report.js';
import { monitoringRoutes } from './jobs/monitoring.js';
import { probeRoutes } from './jobs/probe-routes.js';
const app = new Hono();
// Middleware
app.use('*', cors());
app.use('*', logger());
// Health check endpoint
app.get('/health', (c) => c.json({
    status: 'healthy',
    service: 'dns-ops-collector',
    timestamp: new Date().toISOString(),
}));
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
    return c.json({
        error: 'Internal Server Error',
        message: err.message,
    }, 500);
});
// Start server
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
serve({
    fetch: app.fetch,
    port,
}, (info) => {
    console.log(`🚀 DNS Ops Collector running on port ${info.port}`);
    console.log(`📊 Health check: http://localhost:${info.port}/health`);
});
export default app;
//# sourceMappingURL=index.js.map