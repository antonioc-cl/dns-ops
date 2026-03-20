/**
 * Monitoring Routes Tests
 *
 * Tests for the monitoring API endpoints.
 * Verifies that DB context is properly checked and routes handle missing db gracefully.
 */

import { Hono } from 'hono';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Env } from '../types.js';
import { monitoringRoutes } from './monitoring.js';

describe('Monitoring Routes', () => {
  describe('Database availability checks', () => {
    let appWithoutDb: Hono<Env>;

    beforeEach(() => {
      // Create app WITHOUT db middleware to simulate missing db context
      appWithoutDb = new Hono<Env>();
      appWithoutDb.route('/api/monitoring', monitoringRoutes);
    });

    it('POST /check should return 503 if database is not available', async () => {
      const res = await appWithoutDb.request('/api/monitoring/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule: 'daily' }),
      });

      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.error).toBe('Database not available');
    });

    it('GET /alerts/pending should return 503 if database is not available', async () => {
      const res = await appWithoutDb.request('/api/monitoring/alerts/pending');

      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.error).toBe('Database not available');
    });

    it('POST /alerts/:alertId/acknowledge should return 503 if database is not available', async () => {
      const res = await appWithoutDb.request('/api/monitoring/alerts/test-alert-id/acknowledge', {
        method: 'POST',
      });

      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.error).toBe('Database not available');
    });

    it('POST /alerts/:alertId/resolve should return 503 if database is not available', async () => {
      const res = await appWithoutDb.request('/api/monitoring/alerts/test-alert-id/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolutionNote: 'Fixed' }),
      });

      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.error).toBe('Database not available');
    });

    it('GET /reports/shared should return 503 if database is not available', async () => {
      const res = await appWithoutDb.request('/api/monitoring/reports/shared');

      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.error).toBe('Database not available');
    });

    it('POST /domains/:domainId/monitor should return 503 if database is not available', async () => {
      const res = await appWithoutDb.request('/api/monitoring/domains/test-domain-id/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule: 'daily' }),
      });

      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.error).toBe('Database not available');
    });

    it('DELETE /domains/:domainId/monitor should return 503 if database is not available', async () => {
      const res = await appWithoutDb.request('/api/monitoring/domains/test-domain-id/monitor', {
        method: 'DELETE',
      });

      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.error).toBe('Database not available');
    });
  });

  describe('Health check', () => {
    it('GET /health should return healthy status without db', async () => {
      const app = new Hono<Env>();
      app.route('/api/monitoring', monitoringRoutes);

      const res = await app.request('/api/monitoring/health');

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('healthy');
      expect(json.service).toBe('monitoring');
    });
  });
});
