/**
 * Fleet Report Routes Tests
 *
 * Tests for the fleet report API endpoints.
 * Verifies that DB context is properly available and routes work correctly.
 */

import { Hono } from 'hono';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Env } from '../types.js';
import { fleetReportRoutes } from './fleet-report.js';

describe('Fleet Report Routes', () => {
  let app: Hono<Env>;

  beforeEach(() => {
    // Create app with fleet report routes and mock DB middleware
    app = new Hono<Env>();
    app.use('*', async (c, next) => {
      // Mock DB adapter - simulating what dbMiddleware provides
      c.set('db', {
        query: () => Promise.resolve([]),
        getDrizzle: () => ({
          query: {
            domains: { findMany: () => Promise.resolve([]) },
            snapshots: { findFirst: () => Promise.resolve(null) },
            findings: { findMany: () => Promise.resolve([]) },
          },
        }),
      } as unknown as import('@dns-ops/db').IDatabaseAdapter);
      c.set('tenantId', 'test-tenant-uuid');
      c.set('actorId', 'test-actor');
      await next();
    });
    app.route('/api/fleet-report', fleetReportRoutes);
  });

  describe('POST /api/fleet-report/run', () => {
    it('should return 400 if inventory is empty', async () => {
      const res = await app.request('/api/fleet-report/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventory: [] }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Inventory required');
    });

    it('should return 400 if inventory is missing', async () => {
      const res = await app.request('/api/fleet-report/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Inventory required');
    });

    it('should return 400 if inventory exceeds max size', async () => {
      const largeInventory = Array(1001).fill('example.com');

      const res = await app.request('/api/fleet-report/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventory: largeInventory }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('too large');
    });

    it('should process valid inventory (DB context available)', async () => {
      // This test verifies that the DB context is properly available
      // The route successfully uses c.get('db') without crashing
      const res = await app.request('/api/fleet-report/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventory: ['example.com'] }),
      });

      // The route should work (200) or fail gracefully with a domain/repository error
      // The key assertion is that we DON'T get a "DB context missing" crash
      expect([200, 500]).toContain(res.status);
      const json = await res.json();
      // Should NOT be a "DB context missing" error (if error exists)
      if (json.error) {
        expect(json.error).not.toContain('DB context missing');
      }
    });
  });

  describe('GET /api/fleet-report/templates', () => {
    it('should return available report templates', async () => {
      const res = await app.request('/api/fleet-report/templates');

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.templates).toBeInstanceOf(Array);
      expect(json.templates.length).toBeGreaterThan(0);
      expect(json.templates[0]).toHaveProperty('id');
      expect(json.templates[0]).toHaveProperty('name');
      expect(json.templates[0]).toHaveProperty('checks');
    });
  });

  describe('POST /api/fleet-report/import-csv', () => {
    it('should import domains from CSV', async () => {
      const csv = 'domain\nexample.com\nexample.org\n';

      const res = await app.request('/api/fleet-report/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: csv,
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.imported).toBe(2);
      expect(json.inventory).toContain('example.com');
      expect(json.inventory).toContain('example.org');
    });

    it('should return 400 for empty CSV', async () => {
      const res = await app.request('/api/fleet-report/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: '',
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('CSV data required');
    });

    it('should return 400 if domain column is missing', async () => {
      const csv = 'name\nexample.com\n';

      const res = await app.request('/api/fleet-report/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: csv,
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('domain" column');
    });
  });
});
